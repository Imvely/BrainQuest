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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CharacterService 단위 테스트")
class CharacterServiceTest {

    @InjectMocks
    private CharacterService characterService;

    @Mock
    private CharacterRepository characterRepository;

    @Mock
    private ItemRepository itemRepository;

    @Mock
    private UserItemRepository userItemRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    // ── 헬퍼 메서드 ──

    private Character createWarrior(Long userId) {
        return Character.builder()
                .userId(userId).name("전사").classType(ClassType.WARRIOR)
                .statAtk(15).statDef(12).statWis(8).statAgi(8).statHp(120)
                .appearance(Map.of("hair", "style1"))
                .build();
    }

    /** 지정 레벨까지 레벨업된 캐릭터를 생성한다. */
    private Character characterAtLevel(Long userId, int targetLevel) {
        Character c = createWarrior(userId);
        while (c.getLevel() < targetLevel) {
            c.addExp(c.getExpToNext());
            c.levelUp();
        }
        return c;
    }

    private User createUser(Long userId) {
        return User.builder()
                .provider("KAKAO").providerId("test_" + userId)
                .nickname("user" + userId).email("user" + userId + "@test.com")
                .build();
    }

    private Item mockItem(Long id, ItemSlot slot, ItemRarity rarity,
                          Map<String, Integer> statBonus) {
        Item item = mock(Item.class);
        lenient().when(item.getId()).thenReturn(id);
        lenient().when(item.getName()).thenReturn("아이템" + id);
        lenient().when(item.getDescription()).thenReturn("설명");
        lenient().when(item.getSlot()).thenReturn(slot);
        lenient().when(item.getRarity()).thenReturn(rarity);
        lenient().when(item.getStatBonus()).thenReturn(statBonus);
        lenient().when(item.getImageUrl()).thenReturn(null);
        return item;
    }

    private Item mockWeapon(Long id) {
        return mockItem(id, ItemSlot.WEAPON, ItemRarity.COMMON,
                Map.of("atk", 5, "def", 0, "wis", 0, "agi", 0, "hp", 0));
    }

    // ──────────────────────────────────────────────
    // createCharacter
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("createCharacter")
    class CreateCharacter {

        @Test
        @DisplayName("WARRIOR — ATK=15, DEF=12, WIS=8, AGI=8, HP=120")
        void warrior_correctStats() {
            // given
            Long userId = 1L;
            var request = new CreateCharacterRequest("용사", ClassType.WARRIOR, Map.of("hair", "s1"));

            given(characterRepository.existsByUserId(userId)).willReturn(false);
            given(characterRepository.save(any(Character.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            CharacterResponse res = characterService.createCharacter(userId, request);

            // then
            assertThat(res.name()).isEqualTo("용사");
            assertThat(res.classType()).isEqualTo(ClassType.WARRIOR);
            assertThat(res.stats().atk()).isEqualTo(15);
            assertThat(res.stats().def()).isEqualTo(12);
            assertThat(res.stats().wis()).isEqualTo(8);
            assertThat(res.stats().agi()).isEqualTo(8);
            assertThat(res.stats().hp()).isEqualTo(120);
            assertThat(res.level()).isEqualTo(1);
            assertThat(res.exp()).isEqualTo(0);
            assertThat(res.expToNext()).isEqualTo(100);
            assertThat(res.gold()).isEqualTo(0);
            assertThat(res.equippedItems()).isEmpty();

            verify(characterRepository).save(any(Character.class));
        }

        @Test
        @DisplayName("MAGE — ATK=8, DEF=8, WIS=15, AGI=10, HP=90")
        void mage_correctStats() {
            // given
            Long userId = 1L;
            var request = new CreateCharacterRequest("마법사", ClassType.MAGE, Map.of("hair", "s2"));

            given(characterRepository.existsByUserId(userId)).willReturn(false);
            given(characterRepository.save(any(Character.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            CharacterResponse res = characterService.createCharacter(userId, request);

            // then
            assertThat(res.classType()).isEqualTo(ClassType.MAGE);
            assertThat(res.stats().atk()).isEqualTo(8);
            assertThat(res.stats().def()).isEqualTo(8);
            assertThat(res.stats().wis()).isEqualTo(15);
            assertThat(res.stats().agi()).isEqualTo(10);
            assertThat(res.stats().hp()).isEqualTo(90);
        }

        @Test
        @DisplayName("RANGER — ATK=10, DEF=10, WIS=10, AGI=15, HP=100")
        void ranger_correctStats() {
            // given
            Long userId = 1L;
            var request = new CreateCharacterRequest("레인저", ClassType.RANGER, Map.of("hair", "s3"));

            given(characterRepository.existsByUserId(userId)).willReturn(false);
            given(characterRepository.save(any(Character.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            CharacterResponse res = characterService.createCharacter(userId, request);

            // then
            assertThat(res.classType()).isEqualTo(ClassType.RANGER);
            assertThat(res.stats().atk()).isEqualTo(10);
            assertThat(res.stats().def()).isEqualTo(10);
            assertThat(res.stats().wis()).isEqualTo(10);
            assertThat(res.stats().agi()).isEqualTo(15);
            assertThat(res.stats().hp()).isEqualTo(100);
        }

        @Test
        @DisplayName("이미 캐릭터 존재 — DuplicateResourceException")
        void duplicate_throwsException() {
            // given
            Long userId = 1L;
            var request = new CreateCharacterRequest("용사", ClassType.WARRIOR, Map.of());

            given(characterRepository.existsByUserId(userId)).willReturn(true);

            // when & then
            assertThatThrownBy(() -> characterService.createCharacter(userId, request))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("이미 캐릭터가 존재합니다.");

            verify(characterRepository, never()).save(any());
        }
    }

    // ──────────────────────────────────────────────
    // getCharacter
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("getCharacter")
    class GetCharacter {

        @Test
        @DisplayName("정상 — 장착 장비 없는 캐릭터 조회")
        void success_noEquipment() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));

            // when
            CharacterResponse res = characterService.getCharacter(userId);

            // then
            assertThat(res.name()).isEqualTo("전사");
            assertThat(res.classType()).isEqualTo(ClassType.WARRIOR);
            assertThat(res.stats().atk()).isEqualTo(15);
            assertThat(res.equippedItems()).isEmpty();
        }

        @Test
        @DisplayName("정상 — 장착 장비의 스탯 보너스가 합산됨")
        void success_withEquipmentStatBonus() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);
            character.updateEquippedItems(Map.of("weapon", 100L, "helmet", 200L));

            Item weapon = mockItem(100L, ItemSlot.WEAPON, ItemRarity.COMMON,
                    Map.of("atk", 5, "def", 0, "wis", 0, "agi", 0, "hp", 0));
            Item helmet = mockItem(200L, ItemSlot.HELMET, ItemRarity.UNCOMMON,
                    Map.of("atk", 0, "def", 4, "wis", 2, "agi", 0, "hp", 5));

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));
            given(itemRepository.findAllById(any())).willReturn(List.of(weapon, helmet));

            // when
            CharacterResponse res = characterService.getCharacter(userId);

            // then — 기본 스탯 + 장비 보너스 합산
            assertThat(res.stats().atk()).isEqualTo(15 + 5);     // base + weapon
            assertThat(res.stats().def()).isEqualTo(12 + 4);     // base + helmet
            assertThat(res.stats().wis()).isEqualTo(8 + 2);      // base + helmet
            assertThat(res.stats().hp()).isEqualTo(120 + 5);     // base + helmet
            assertThat(res.equippedItems()).hasSize(2);
            assertThat(res.equippedItems()).containsKey("weapon");
            assertThat(res.equippedItems()).containsKey("helmet");
        }

        @Test
        @DisplayName("캐릭터 없음 — EntityNotFoundException")
        void notFound_throwsException() {
            // given
            given(characterRepository.findByUserId(99L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> characterService.getCharacter(99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("캐릭터를 찾을 수 없습니다.");
        }
    }

    // ──────────────────────────────────────────────
    // addExp
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("addExp")
    class AddExp {

        @Test
        @DisplayName("캐릭터 없으면 스킵 — save 호출 없음")
        void noCharacter_skips() {
            // given
            given(characterRepository.findByUserId(99L)).willReturn(Optional.empty());

            // when
            characterService.addExp(99L, 100, StatType.ATK);

            // then
            verify(characterRepository, never()).save(any());
            verify(eventPublisher, never()).publishEvent(any());
        }

        @Test
        @DisplayName("레벨업 없이 경험치 + 스탯 증가")
        void noLevelUp_expAndStatIncrease() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));

            // when
            characterService.addExp(userId, 50, StatType.ATK);

            // then
            assertThat(character.getExp()).isEqualTo(50);
            assertThat(character.getStatAtk()).isEqualTo(15 + 2); // max(1, 50/20) = 2
            assertThat(character.getLevel()).isEqualTo(1);

            verify(characterRepository).save(character);
            verify(eventPublisher, never()).publishEvent(any());
        }

        @Test
        @DisplayName("스탯 증가량 최소 1 보장 — 경험치 10 부여 시 amount/20=0이므로 1 적용")
        void statIncrease_minimum1() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));

            // when
            characterService.addExp(userId, 10, StatType.WIS);

            // then — max(1, 10/20) = max(1, 0) = 1
            assertThat(character.getStatWis()).isEqualTo(8 + 1);
        }

        @Test
        @DisplayName("StatType별 올바른 스탯에 경험치 분배")
        void statDistribution_eachType() {
            // given — 5개 캐릭터를 각 StatType에 대해 테스트
            for (StatType type : StatType.values()) {
                Character character = createWarrior(1L);
                given(characterRepository.findByUserId(1L)).willReturn(Optional.of(character));

                // when
                characterService.addExp(1L, 40, type); // max(1, 40/20) = 2

                // then
                switch (type) {
                    case ATK -> assertThat(character.getStatAtk()).isEqualTo(15 + 2);
                    case WIS -> assertThat(character.getStatWis()).isEqualTo(8 + 2);
                    case DEF -> assertThat(character.getStatDef()).isEqualTo(12 + 2);
                    case AGI -> assertThat(character.getStatAgi()).isEqualTo(8 + 2);
                    case HP -> assertThat(character.getStatHp()).isEqualTo(120 + 2);
                }
            }
        }

        @Test
        @DisplayName("레벨업 1회 — 레벨 2, 골드 +20, LevelUpEvent 1회")
        void singleLevelUp() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);
            character.addExp(90); // exp=90, expToNext=100

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));

            // when — +20 → 110 >= 100 → levelUp
            characterService.addExp(userId, 20, StatType.ATK);

            // then
            // 110-100=10, level=2, expToNext=floor(50*2^1.5)=141
            assertThat(character.getLevel()).isEqualTo(2);
            assertThat(character.getExp()).isEqualTo(10);
            assertThat(character.getExpToNext()).isEqualTo(141);
            assertThat(character.getGold()).isEqualTo(20); // level 2 * 10

            verify(eventPublisher).publishEvent(any(LevelUpEvent.class));
            verify(characterRepository).save(character);
        }

        @Test
        @DisplayName("다중 레벨업 — 500 경험치로 레벨 1→4, 골드 90, 이벤트 3회")
        void multipleLevelUps() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));

            // when
            characterService.addExp(userId, 500, StatType.ATK);

            // then
            // Lv1→2: exp=400, expToNext=141, gold+=20
            // Lv2→3: exp=259, expToNext=259, gold+=30
            // Lv3→4: exp=0,   expToNext=400, gold+=40
            assertThat(character.getLevel()).isEqualTo(4);
            assertThat(character.getExp()).isEqualTo(0);
            assertThat(character.getGold()).isEqualTo(90);

            verify(eventPublisher, times(3)).publishEvent(any(LevelUpEvent.class));
        }

        @Test
        @DisplayName("LevelUpEvent에 올바른 레벨과 골드 보상 포함")
        void levelUpEvent_containsCorrectRewards() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);
            character.addExp(95);

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));

            // when — 95+10=105 >= 100 → level 2
            characterService.addExp(userId, 10, StatType.DEF);

            // then
            ArgumentCaptor<LevelUpEvent> captor = ArgumentCaptor.forClass(LevelUpEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());

            LevelUpEvent event = captor.getValue();
            assertThat(event.getUserId()).isEqualTo(userId);
            assertThat(event.getNewLevel()).isEqualTo(2);
            assertThat(event.getRewards()).containsEntry("gold", 20);
        }

        @Test
        @DisplayName("레벨 5 도달 시 아이템 상자 지급")
        void level5_itemBoxDrop() {
            // given
            Long userId = 1L;
            Character character = characterAtLevel(userId, 4);
            // 레벨 4: expToNext=400, exp를 거의 채워둠
            character.addExp(character.getExpToNext() - 1); // exp=399

            Item boxItem = mockWeapon(1L);
            User user = createUser(userId);

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));
            given(itemRepository.findAllByRarityIn(anyList())).willReturn(List.of(boxItem));
            given(userRepository.getReferenceById(userId)).willReturn(user);
            given(userItemRepository.save(any(UserItem.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when — 399+10=409 >= 400 → level 5 → item box
            characterService.addExp(userId, 10, StatType.ATK);

            // then
            assertThat(character.getLevel()).isEqualTo(5);

            ArgumentCaptor<UserItem> captor = ArgumentCaptor.forClass(UserItem.class);
            verify(userItemRepository).save(captor.capture());
            assertThat(captor.getValue().getSource()).isEqualTo("LEVEL_UP");
        }
    }

    // ──────────────────────────────────────────────
    // addGold
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("addGold")
    class AddGold {

        @Test
        @DisplayName("정상 — 골드 추가")
        void success() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));

            // when
            characterService.addGold(userId, 100);

            // then
            assertThat(character.getGold()).isEqualTo(100);
            verify(characterRepository).save(character);
        }

        @Test
        @DisplayName("누적 — 기존 골드에 합산")
        void accumulates() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);
            character.addGold(50); // 기존 골드

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));

            // when
            characterService.addGold(userId, 30);

            // then
            assertThat(character.getGold()).isEqualTo(80);
        }

        @Test
        @DisplayName("캐릭터 없음 — EntityNotFoundException")
        void notFound_throwsException() {
            // given
            given(characterRepository.findByUserId(99L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> characterService.addGold(99L, 50))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("캐릭터를 찾을 수 없습니다.");

            verify(characterRepository, never()).save(any());
        }
    }

    // ──────────────────────────────────────────────
    // equipItem
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("equipItem")
    class EquipItem {

        @Test
        @DisplayName("정상 — 무기 장착 성공, 스탯 보너스 반영")
        void success_equipWeapon() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);
            var request = new EquipRequest("WEAPON", 100L);

            Item weapon = mockItem(100L, ItemSlot.WEAPON, ItemRarity.COMMON,
                    Map.of("atk", 5, "def", 0, "wis", 0, "agi", 0, "hp", 0));
            User user = createUser(userId);
            UserItem userItem = UserItem.builder()
                    .user(user).item(weapon).source("BATTLE_DROP").build();

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));
            given(userItemRepository.findByUserIdAndItemId(userId, 100L))
                    .willReturn(Optional.of(userItem));
            given(characterRepository.save(any(Character.class)))
                    .willAnswer(inv -> inv.getArgument(0));
            given(itemRepository.findAllById(any())).willReturn(List.of(weapon));

            // when
            CharacterResponse res = characterService.equipItem(userId, request);

            // then
            assertThat(res.equippedItems()).containsKey("weapon");
            assertThat(res.stats().atk()).isEqualTo(15 + 5); // base + weapon bonus

            verify(characterRepository).save(character);
        }

        @Test
        @DisplayName("이전 장비 자동 교체 — 같은 슬롯에 새 장비 장착")
        void replacesExistingEquipment() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);
            character.updateEquippedItems(new HashMap<>(Map.of("weapon", 50L)));
            var request = new EquipRequest("WEAPON", 100L);

            Item newWeapon = mockItem(100L, ItemSlot.WEAPON, ItemRarity.UNCOMMON,
                    Map.of("atk", 8, "def", 1, "wis", 0, "agi", 1, "hp", 0));
            User user = createUser(userId);
            UserItem userItem = UserItem.builder()
                    .user(user).item(newWeapon).source("QUEST_REWARD").build();

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));
            given(userItemRepository.findByUserIdAndItemId(userId, 100L))
                    .willReturn(Optional.of(userItem));
            given(characterRepository.save(any(Character.class)))
                    .willAnswer(inv -> inv.getArgument(0));
            given(itemRepository.findAllById(any())).willReturn(List.of(newWeapon));

            // when
            CharacterResponse res = characterService.equipItem(userId, request);

            // then — 기존 50 → 100으로 교체
            assertThat(character.getEquippedItems().get("weapon")).isEqualTo(100L);
            assertThat(res.stats().atk()).isEqualTo(15 + 8);
        }

        @Test
        @DisplayName("캐릭터 없음 — EntityNotFoundException")
        void characterNotFound_throwsException() {
            // given
            var request = new EquipRequest("WEAPON", 100L);
            given(characterRepository.findByUserId(99L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> characterService.equipItem(99L, request))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("캐릭터를 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("아이템 미보유 — UnauthorizedException")
        void itemNotOwned_throwsException() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);
            var request = new EquipRequest("WEAPON", 999L);

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));
            given(userItemRepository.findByUserIdAndItemId(userId, 999L))
                    .willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> characterService.equipItem(userId, request))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("보유하고 있지 않습니다.");

            verify(characterRepository, never()).save(any());
        }

        @Test
        @DisplayName("슬롯 불일치 — IllegalArgumentException")
        void slotMismatch_throwsException() {
            // given
            Long userId = 1L;
            Character character = createWarrior(userId);
            var request = new EquipRequest("HELMET", 100L); // HELMET 슬롯 요청

            // 실제 아이템은 WEAPON
            Item weapon = mockItem(100L, ItemSlot.WEAPON, ItemRarity.COMMON,
                    Map.of("atk", 3, "def", 0, "wis", 0, "agi", 0, "hp", 0));
            User user = createUser(userId);
            UserItem userItem = UserItem.builder()
                    .user(user).item(weapon).source("BATTLE_DROP").build();

            given(characterRepository.findByUserId(userId)).willReturn(Optional.of(character));
            given(userItemRepository.findByUserIdAndItemId(userId, 100L))
                    .willReturn(Optional.of(userItem));

            // when & then
            assertThatThrownBy(() -> characterService.equipItem(userId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("슬롯이 일치하지 않습니다");

            verify(characterRepository, never()).save(any());
        }
    }

    // ──────────────────────────────────────────────
    // getInventory
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("getInventory")
    class GetInventory {

        @Test
        @DisplayName("아이템 보유 — 목록 반환")
        void returnsList() {
            // given
            Long userId = 1L;
            Item item = mockWeapon(1L);
            User user = createUser(userId);
            UserItem userItem = UserItem.builder()
                    .user(user).item(item).source("BATTLE_DROP").build();

            given(userItemRepository.findAllByUserId(userId)).willReturn(List.of(userItem));

            // when
            List<UserItemResponse> result = characterService.getInventory(userId);

            // then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).source()).isEqualTo("BATTLE_DROP");
            assertThat(result.get(0).item().slot()).isEqualTo(ItemSlot.WEAPON);
        }

        @Test
        @DisplayName("아이템 없음 — 빈 목록")
        void returnsEmpty() {
            // given
            given(userItemRepository.findAllByUserId(99L)).willReturn(List.of());

            // when
            List<UserItemResponse> result = characterService.getInventory(99L);

            // then
            assertThat(result).isEmpty();
        }
    }

    // ──────────────────────────────────────────────
    // dropItem
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("dropItem")
    class DropItem {

        @Test
        @DisplayName("유효하지 않은 등급 — IllegalArgumentException")
        void invalidGrade_throwsException() {
            // when & then
            assertThatThrownBy(() -> characterService.dropItem(1L, "X"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("유효하지 않은 등급");

            verify(userItemRepository, never()).save(any());
        }

        @Test
        @DisplayName("드롭 실패 (확률 미달) — null 반환")
        void dropFails_returnsNull() {
            try (MockedStatic<ThreadLocalRandom> mocked = mockStatic(ThreadLocalRandom.class)) {
                // given — nextInt(100)=99 → 모든 등급 확률보다 큼
                ThreadLocalRandom mockRandom = mock(ThreadLocalRandom.class);
                mocked.when(ThreadLocalRandom::current).thenReturn(mockRandom);
                given(mockRandom.nextInt(100)).willReturn(99);

                // when
                UserItemResponse result = characterService.dropItem(1L, "A");

                // then
                assertThat(result).isNull();
                verify(userItemRepository, never()).save(any());
            }
        }

        @Test
        @DisplayName("드롭 성공 — UserItemResponse 반환, source=BATTLE_DROP")
        void dropSucceeds_returnsItem() {
            try (MockedStatic<ThreadLocalRandom> mocked = mockStatic(ThreadLocalRandom.class)) {
                // given — nextInt(100)=0 → 확률 통과
                ThreadLocalRandom mockRandom = mock(ThreadLocalRandom.class);
                mocked.when(ThreadLocalRandom::current).thenReturn(mockRandom);
                given(mockRandom.nextInt(100)).willReturn(0);
                given(mockRandom.nextInt(1)).willReturn(0); // 첫 번째 아이템 선택

                Long userId = 1L;
                Item item = mockItem(10L, ItemSlot.ARMOR, ItemRarity.RARE,
                        Map.of("atk", 2, "def", 10, "wis", 0, "agi", 3, "hp", 15));
                User user = createUser(userId);

                given(itemRepository.findAllByRarityIn(anyList())).willReturn(List.of(item));
                given(userRepository.getReferenceById(userId)).willReturn(user);
                given(userItemRepository.save(any(UserItem.class)))
                        .willAnswer(inv -> inv.getArgument(0));

                // when
                UserItemResponse result = characterService.dropItem(userId, "B");

                // then
                assertThat(result).isNotNull();
                assertThat(result.source()).isEqualTo("BATTLE_DROP");
                assertThat(result.item().rarity()).isEqualTo(ItemRarity.RARE);

                verify(userItemRepository).save(any(UserItem.class));
            }
        }

        @Test
        @DisplayName("등급별 드롭 풀 — E/D는 COMMON+UNCOMMON, B/A는 RARE+EPIC")
        void gradePool_correctRarities() {
            try (MockedStatic<ThreadLocalRandom> mocked = mockStatic(ThreadLocalRandom.class)) {
                // given — nextInt(anyInt())로 통합 (100, candidates.size() 모두 매칭)
                ThreadLocalRandom mockRandom = mock(ThreadLocalRandom.class);
                mocked.when(ThreadLocalRandom::current).thenReturn(mockRandom);
                given(mockRandom.nextInt(anyInt())).willReturn(0);

                Item item = mockWeapon(1L);
                User user = createUser(1L);

                given(itemRepository.findAllByRarityIn(anyList())).willReturn(List.of(item));
                given(userRepository.getReferenceById(1L)).willReturn(user);
                given(userItemRepository.save(any(UserItem.class)))
                        .willAnswer(inv -> inv.getArgument(0));

                // when — 등급 "E"로 드롭
                characterService.dropItem(1L, "E");

                // then — COMMON, UNCOMMON 풀로 조회
                @SuppressWarnings("unchecked")
                ArgumentCaptor<List<ItemRarity>> captor = ArgumentCaptor.forClass(List.class);
                verify(itemRepository).findAllByRarityIn(captor.capture());

                List<ItemRarity> pool = captor.getValue();
                assertThat(pool).containsExactly(ItemRarity.COMMON, ItemRarity.UNCOMMON);
            }
        }
    }
}
