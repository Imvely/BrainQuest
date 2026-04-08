package com.brainquest.character.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 캐릭터 엔티티.
 * <p>사용자당 1개의 캐릭터를 보유한다 (1:1 관계).</p>
 */
@Entity
@Table(name = "characters")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Character {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(length = 30, nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "class_type", length = 20, nullable = false)
    private ClassType classType;

    @Column(nullable = false)
    private int level = 1;

    @Column(nullable = false)
    private int exp = 0;

    @Column(name = "exp_to_next", nullable = false)
    private int expToNext = 100;

    @Column(name = "stat_atk", nullable = false)
    private int statAtk = 10;

    @Column(name = "stat_wis", nullable = false)
    private int statWis = 10;

    @Column(name = "stat_def", nullable = false)
    private int statDef = 10;

    @Column(name = "stat_agi", nullable = false)
    private int statAgi = 10;

    @Column(name = "stat_hp", nullable = false)
    private int statHp = 100;

    @Column(nullable = false)
    private int gold = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "appearance", columnDefinition = "jsonb", nullable = false)
    private Map<String, String> appearance = new HashMap<>();

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "equipped_items", columnDefinition = "jsonb", nullable = false)
    private Map<String, Long> equippedItems = new HashMap<>();

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public Character(Long userId, String name, ClassType classType,
                     int statAtk, int statWis, int statDef, int statAgi, int statHp,
                     Map<String, String> appearance) {
        this.userId = userId;
        this.name = name;
        this.classType = classType;
        this.statAtk = statAtk;
        this.statWis = statWis;
        this.statDef = statDef;
        this.statAgi = statAgi;
        this.statHp = statHp;
        this.appearance = appearance != null ? appearance : new HashMap<>();
        this.equippedItems = new HashMap<>();
    }

    /**
     * 경험치를 추가한다.
     */
    public void addExp(int amount) {
        this.exp += amount;
    }

    /**
     * 레벨업을 수행한다. exp >= expToNext일 때 호출.
     */
    public void levelUp() {
        this.exp -= this.expToNext;
        this.level++;
        this.expToNext = (int) Math.floor(50 * Math.pow(this.level, 1.5));
    }

    /**
     * 골드를 추가한다.
     */
    public void addGold(int amount) {
        this.gold += amount;
    }

    /**
     * 특정 스탯을 증가시킨다.
     */
    public void addStat(StatType statType, int amount) {
        switch (statType) {
            case ATK -> this.statAtk += amount;
            case WIS -> this.statWis += amount;
            case DEF -> this.statDef += amount;
            case AGI -> this.statAgi += amount;
            case HP -> this.statHp += amount;
        }
    }

    /**
     * 장착 아이템 맵을 업데이트한다.
     */
    public void updateEquippedItems(Map<String, Long> equippedItems) {
        this.equippedItems = equippedItems;
    }
}
