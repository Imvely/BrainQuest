package com.brainquest.character.repository;

import com.brainquest.character.entity.Item;
import com.brainquest.character.entity.ItemRarity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {

    List<Item> findAllByRarity(ItemRarity rarity);

    List<Item> findAllByRarityIn(List<ItemRarity> rarities);
}
