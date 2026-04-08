package com.brainquest.battle.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Entity
@Table(name = "battle_sessions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class BattleSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "quest_id")
    private Long questId;

    @Column(name = "checkpoint_id")
    private Long checkpointId;

    @Column(name = "planned_min", nullable = false)
    private int plannedMin;

    @Column(name = "actual_min")
    private Integer actualMin;

    @Column(name = "monster_type", length = 30, nullable = false)
    private String monsterType;

    @Column(name = "monster_max_hp", nullable = false)
    private int monsterMaxHp;

    @Column(name = "monster_remaining_hp", nullable = false)
    private int monsterRemainingHp;

    @Column(name = "max_combo", nullable = false)
    private int maxCombo = 0;

    @Column(name = "exit_count", nullable = false)
    private int exitCount = 0;

    @Column(name = "total_exit_sec", nullable = false)
    private int totalExitSec = 0;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private BattleResult result;

    @Column(name = "exp_earned", nullable = false)
    private int expEarned = 0;

    @Column(name = "gold_earned", nullable = false)
    private int goldEarned = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "item_drops", columnDefinition = "jsonb")
    private List<Map<String, Object>> itemDrops;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public BattleSession(Long userId, Long questId, Long checkpointId,
                         int plannedMin, String monsterType,
                         int monsterMaxHp) {
        this.userId = userId;
        this.questId = questId;
        this.checkpointId = checkpointId;
        this.plannedMin = plannedMin;
        this.monsterType = monsterType;
        this.monsterMaxHp = monsterMaxHp;
        this.monsterRemainingHp = monsterMaxHp;
        this.startedAt = LocalDateTime.now();
    }

    public boolean isActive() {
        return this.result == null && this.endedAt == null;
    }

    public void incrementExitCount() {
        this.exitCount++;
    }

    public void addExitDuration(int durationSec) {
        this.totalExitSec += durationSec;
    }

    public void recoverMonsterHp(int amount) {
        this.monsterRemainingHp = Math.min(this.monsterRemainingHp + amount, this.monsterMaxHp);
    }

    public void endBattle(BattleResult result, int actualMin, int maxCombo,
                          int expEarned, int goldEarned,
                          List<Map<String, Object>> itemDrops) {
        this.result = result;
        this.actualMin = actualMin;
        this.maxCombo = maxCombo;
        this.expEarned = expEarned;
        this.goldEarned = goldEarned;
        this.itemDrops = itemDrops;
        this.endedAt = LocalDateTime.now();
    }

    public void autoDefeat() {
        this.result = BattleResult.DEFEAT;
        this.endedAt = LocalDateTime.now();
    }
}
