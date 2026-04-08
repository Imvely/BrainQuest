package com.brainquest.character.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

/**
 * 아이템 마스터 데이터 엔티티.
 */
@Entity
@Table(name = "items")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(length = 100, nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(length = 15, nullable = false)
    private ItemSlot slot;

    @Enumerated(EnumType.STRING)
    @Column(length = 10, nullable = false)
    private ItemRarity rarity;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "stat_bonus", columnDefinition = "jsonb", nullable = false)
    private Map<String, Integer> statBonus;

    @Column(name = "image_url", length = 500)
    private String imageUrl;
}
