package com.brainquest.battle.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "battle_exits")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class BattleExit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_id", nullable = false)
    private Long sessionId;

    @Column(name = "exit_at", nullable = false)
    private LocalDateTime exitAt;

    @Column(name = "return_at")
    private LocalDateTime returnAt;

    @Column(name = "duration_sec")
    private Integer durationSec;

    @Enumerated(EnumType.STRING)
    @Column(name = "penalty_type", length = 20, nullable = false)
    private PenaltyType penaltyType;

    @Builder
    public BattleExit(Long sessionId, LocalDateTime exitAt, PenaltyType penaltyType) {
        this.sessionId = sessionId;
        this.exitAt = exitAt;
        this.penaltyType = penaltyType;
    }

    public void recordReturn(LocalDateTime returnAt, int durationSec, PenaltyType penaltyType) {
        this.returnAt = returnAt;
        this.durationSec = durationSec;
        this.penaltyType = penaltyType;
    }
}
