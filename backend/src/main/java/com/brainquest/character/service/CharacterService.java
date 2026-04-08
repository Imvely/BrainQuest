package com.brainquest.character.service;

import com.brainquest.auth.entity.User;
import com.brainquest.auth.repository.UserRepository;
import com.brainquest.character.dto.*;
import com.brainquest.character.entity.Character;
import com.brainquest.character.entity.*;
import com.brainquest.character.repository.CharacterRepository;
import com.brainquest.character.repository.ItemRepository;
import com.brainquest.character.repository.UserItemRepository;
import com.brainquest.common.exception.DuplicateResourceException;
import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.common.exception.UnauthorizedException;
import com.brainquest.event.events.LevelUpEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * 캐릭터 서비스.
 * <p>캐릭터 생성, 경험치/레벨업, 장비 장착, 아이템 드롭 등을 처리한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CharacterService {

    private static final Map<String, Integer> DROP_CHANCE = Map.of(
            "E", 5, "D", 10, "C", 20, "B", 35, "A", 50
    );

    private final CharacterRepository characterRepository;
    private final ItemRepository itemRepository;
    private final UserItemRepository userItemRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 캐릭터를 생성한다. 클래스별 초기 스탯 차등 적용.
     */
    @Transactional
    public CharacterResponse createCharacter(Long userId, CreateCharacterRequest req) {
        if (characterRepository.existsByUserId(userId)) {
            throw new DuplicateResourceException("CHAR_001", "이미 캐릭터가 존재합니다.");
        }

        Character character = switch (req.classType()) {
            case WARRIOR -> Character.builder()
                    .userId(userId).name(req.name()).classType(ClassType.WARRIOR)
                    .statAtk(15).statDef(12).statWis(8).statAgi(8).statHp(120)
                    .appearance(req.appearance()).build();
            case MAGE -> Character.builder()
                    .userId(userId).name(req.name()).classType(ClassType.MAGE)
                    .statAtk(8).statDef(8).statWis(15).statAgi(10).statHp(90)
                    .appearance(req.appearance()).build();
            case RANGER -> Character.builder()
                    .userId(userId).name(req.name()).classType(ClassType.RANGER)
                    .statAtk(10).statDef(10).statWis(10).statAgi(15).statHp(100)
                    .appearance(req.appearance()).build();
        };

        character = characterRepository.save(character);
        log.debug("캐릭터 생성: userId={}, class={}", userId, req.classType());
        return CharacterResponse.of(character, Map.of());
    }

    /**
     * 캐릭터 정보를 조회한다 (장착 장비 상세 포함).
     */
    public CharacterResponse getCharacter(Long userId) {
        Character character = findCharacterByUserId(userId);
        Map<String, Item> equippedDetails = resolveEquippedItems(character);
        return CharacterResponse.of(character, equippedDetails);
    }

    /**
     * 경험치를 부여하고, 스탯 분배 및 레벨업을 처리한다.
     */
    @Transactional
    public void addExp(Long userId, int amount, StatType statType) {
        if (amount <= 0) {
            return;
        }
        Optional<Character> optCharacter = characterRepository.findByUserId(userId);
        if (optCharacter.isEmpty()) {
            log.debug("addExp: 캐릭터 없음 (userId={}), 스킵", userId);
            return;
        }

        Character character = optCharacter.get();
        character.addExp(amount);

        // 스탯 경험치 분배: amount / 20, 최소 1
        int statIncrease = Math.max(1, amount / 20);
        character.addStat(statType, statIncrease);

        // 레벨업 체크 루프
        while (character.getExp() >= character.getExpToNext()) {
            character.levelUp();
            int newLevel = character.getLevel();

            // 레벨업 보상: 골드
            int goldReward = newLevel * 10;
            character.addGold(goldReward);

            Map<String, Object> rewards = new HashMap<>();
            rewards.put("gold", goldReward);

            // 5레벨마다 아이템 상자 지급
            if (newLevel % 5 == 0) {
                UserItem droppedItem = dropItemBox(userId, determineBoxRarity(newLevel));
                if (droppedItem != null) {
                    rewards.put("item", ItemResponse.from(droppedItem.getItem()));
                }
            }

            log.info("레벨업! userId={}, newLevel={}, rewards={}", userId, newLevel, rewards);
            eventPublisher.publishEvent(new LevelUpEvent(this, userId, newLevel, rewards));
        }

        characterRepository.save(character);
    }

    /**
     * 골드를 추가한다.
     */
    @Transactional
    public void addGold(Long userId, int amount) {
        if (amount <= 0) {
            return;
        }
        Character character = findCharacterByUserId(userId);
        character.addGold(amount);
        characterRepository.save(character);
    }

    /**
     * 장비를 장착한다.
     */
    @Transactional
    public CharacterResponse equipItem(Long userId, EquipRequest req) {
        Character character = findCharacterByUserId(userId);

        // 아이템 소유 확인
        UserItem userItem = userItemRepository.findByUserIdAndItemId(userId, req.itemId())
                .orElseThrow(() -> new UnauthorizedException("CHAR_003",
                        "해당 아이템을 보유하고 있지 않습니다."));

        Item item = userItem.getItem();
        ItemSlot slot = ItemSlot.valueOf(req.slot().toUpperCase());

        // 아이템의 슬롯과 요청 슬롯 일치 확인
        if (item.getSlot() != slot) {
            throw new IllegalArgumentException("아이템 슬롯이 일치하지 않습니다. "
                    + "아이템 슬롯: " + item.getSlot() + ", 요청 슬롯: " + slot);
        }

        // 장착 맵 업데이트 (이전 장비 자동 해제)
        Map<String, Long> equipped = new HashMap<>(character.getEquippedItems());
        equipped.put(slot.name().toLowerCase(), item.getId());
        character.updateEquippedItems(equipped);
        characterRepository.save(character);

        Map<String, Item> equippedDetails = resolveEquippedItems(character);
        return CharacterResponse.of(character, equippedDetails);
    }

    /**
     * 인벤토리를 조회한다.
     */
    public List<UserItemResponse> getInventory(Long userId) {
        return userItemRepository.findAllByUserId(userId).stream()
                .map(UserItemResponse::from)
                .toList();
    }

    /**
     * 퀘스트/전투 등급에 따라 아이템 드롭을 시도한다.
     *
     * @return 드롭된 UserItemResponse, 드롭 없으면 null
     */
    @Transactional
    public UserItemResponse dropItem(Long userId, String grade) {
        Integer chance = DROP_CHANCE.get(grade.toUpperCase());
        if (chance == null) {
            throw new IllegalArgumentException("유효하지 않은 등급: " + grade);
        }

        if (ThreadLocalRandom.current().nextInt(100) >= chance) {
            return null; // 드롭 실패
        }

        // 등급별 rarity 가중치 결정
        List<ItemRarity> pool = determineDropPool(grade.toUpperCase());
        List<Item> candidates = itemRepository.findAllByRarityIn(pool);
        if (candidates.isEmpty()) {
            return null;
        }

        Item selected = candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("CHAR_004", "사용자를 찾을 수 없습니다."));

        UserItem userItem = UserItem.builder()
                .user(user)
                .item(selected)
                .source("BATTLE_DROP")
                .build();
        userItem = userItemRepository.save(userItem);

        log.debug("아이템 드롭: userId={}, item={}, rarity={}", userId, selected.getName(), selected.getRarity());
        return UserItemResponse.from(userItem);
    }

    // ── private helpers ──

    private Character findCharacterByUserId(Long userId) {
        return characterRepository.findByUserId(userId)
                .orElseThrow(() -> new EntityNotFoundException("CHAR_002", "캐릭터를 찾을 수 없습니다."));
    }

    /**
     * 장착 아이템 맵을 실제 Item 엔티티로 변환한다.
     * <p>N+1 방지를 위해 findAllById 로 한 번에 조회한다.</p>
     */
    private Map<String, Item> resolveEquippedItems(Character character) {
        Map<String, Long> equipped = character.getEquippedItems();
        List<Long> itemIds = equipped.values().stream()
                .filter(Objects::nonNull)
                .toList();
        if (itemIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, Item> itemMap = itemRepository.findAllById(itemIds).stream()
                .collect(java.util.stream.Collectors.toMap(Item::getId, item -> item));

        Map<String, Item> result = new HashMap<>();
        for (Map.Entry<String, Long> entry : equipped.entrySet()) {
            if (entry.getValue() != null) {
                Item item = itemMap.get(entry.getValue());
                if (item != null) {
                    result.put(entry.getKey(), item);
                }
            }
        }
        return result;
    }

    /**
     * 등급별 드롭 가능 rarity 풀을 결정한다.
     */
    private List<ItemRarity> determineDropPool(String grade) {
        return switch (grade) {
            case "E", "D" -> List.of(ItemRarity.COMMON, ItemRarity.UNCOMMON);
            case "C" -> List.of(ItemRarity.UNCOMMON, ItemRarity.RARE);
            case "B", "A" -> List.of(ItemRarity.RARE, ItemRarity.EPIC);
            default -> List.of(ItemRarity.COMMON);
        };
    }

    /**
     * 레벨에 따라 아이템 상자 rarity를 결정한다.
     */
    private String determineBoxRarity(int level) {
        if (level >= 30) return "RARE";
        if (level >= 15) return "UNCOMMON";
        return "COMMON";
    }

    /**
     * 아이템 상자를 지급한다 (레벨업 보상).
     */
    private UserItem dropItemBox(Long userId, String maxRarity) {
        List<ItemRarity> pool = switch (maxRarity) {
            case "RARE" -> List.of(ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE);
            case "UNCOMMON" -> List.of(ItemRarity.COMMON, ItemRarity.UNCOMMON);
            default -> List.of(ItemRarity.COMMON);
        };

        List<Item> candidates = itemRepository.findAllByRarityIn(pool);
        if (candidates.isEmpty()) {
            return null;
        }

        Item selected = candidates.get(ThreadLocalRandom.current().nextInt(candidates.size()));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("CHAR_004", "사용자를 찾을 수 없습니다."));

        UserItem userItem = UserItem.builder()
                .user(user)
                .item(selected)
                .source("LEVEL_UP")
                .build();
        return userItemRepository.save(userItem);
    }
}
