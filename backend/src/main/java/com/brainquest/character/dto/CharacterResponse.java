package com.brainquest.character.dto;

import com.brainquest.character.entity.Character;
import com.brainquest.character.entity.ClassType;
import com.brainquest.character.entity.Item;

import java.util.Map;

/**
 * 캐릭터 응답.
 * <p>스탯은 기본 스탯 + 장착 장비 보너스 합산값.</p>
 */
public record CharacterResponse(
        Long id,
        String name,
        ClassType classType,
        int level,
        int exp,
        int expToNext,
        StatsResponse stats,
        int gold,
        Map<String, String> appearance,
        Map<String, ItemResponse> equippedItems
) {

    public record StatsResponse(int atk, int wis, int def, int agi, int hp) {
    }

    /**
     * 캐릭터 엔티티와 장착 아이템 상세 정보로 응답을 생성한다.
     */
    public static CharacterResponse of(Character character, Map<String, Item> equippedItemDetails) {
        int bonusAtk = 0, bonusWis = 0, bonusDef = 0, bonusAgi = 0, bonusHp = 0;
        Map<String, ItemResponse> equippedMap = new java.util.HashMap<>();

        for (Map.Entry<String, Item> entry : equippedItemDetails.entrySet()) {
            Item item = entry.getValue();
            equippedMap.put(entry.getKey(), ItemResponse.from(item));
            Map<String, Integer> bonus = item.getStatBonus();
            bonusAtk += bonus.getOrDefault("atk", 0);
            bonusWis += bonus.getOrDefault("wis", 0);
            bonusDef += bonus.getOrDefault("def", 0);
            bonusAgi += bonus.getOrDefault("agi", 0);
            bonusHp += bonus.getOrDefault("hp", 0);
        }

        return new CharacterResponse(
                character.getId(),
                character.getName(),
                character.getClassType(),
                character.getLevel(),
                character.getExp(),
                character.getExpToNext(),
                new StatsResponse(
                        character.getStatAtk() + bonusAtk,
                        character.getStatWis() + bonusWis,
                        character.getStatDef() + bonusDef,
                        character.getStatAgi() + bonusAgi,
                        character.getStatHp() + bonusHp
                ),
                character.getGold(),
                character.getAppearance(),
                equippedMap
        );
    }
}
