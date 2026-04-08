package com.brainquest.character.dto;

import com.brainquest.character.entity.Item;
import com.brainquest.character.entity.ItemRarity;
import com.brainquest.character.entity.ItemSlot;

import java.util.Map;

/**
 * 아이템 응답.
 */
public record ItemResponse(
        Long id,
        String name,
        String description,
        ItemSlot slot,
        ItemRarity rarity,
        Map<String, Integer> statBonus,
        String imageUrl
) {
    public static ItemResponse from(Item item) {
        return new ItemResponse(
                item.getId(),
                item.getName(),
                item.getDescription(),
                item.getSlot(),
                item.getRarity(),
                item.getStatBonus(),
                item.getImageUrl()
        );
    }
}
