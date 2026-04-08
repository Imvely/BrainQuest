package com.brainquest.gate.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 아침/저녁 체크인 기�� 엔티티.
 */
@Entity
@Table(name = "daily_checkins",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "checkin_date", "checkin_type"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class DailyCheckin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "checkin_type", length = 10, nullable = false)
    private CheckinType checkinType;

    @Column(name = "checkin_date", nullable = false)
    private LocalDate checkinDate;

    /** 수면 시간 — MORNING 전용 */
    @Column(name = "sleep_hours", precision = 3, scale = 1)
    private BigDecimal sleepHours;

    /** 수면 질 1-3 — MORNING 전용 */
    @Column(name = "sleep_quality")
    private Integer sleepQuality;

    /** ��디션 1-5 — MORNING 전용 */
    @Column(name = "condition")
    private Integer condition;

    /** 집중력 1-5 — EVENING 전용 */
    @Column(name = "focus_score")
    private Integer focusScore;

    /** 충동성 1-5 — EVENING 전용 */
    @Column(name = "impulsivity_score")
    private Integer impulsivityScore;

    /** 감정 안정도 1-5 — EVENING 전용 */
    @Column(name = "emotion_score")
    private Integer emotionScore;

    @Column(name = "memo")
    private String memo;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public DailyCheckin(Long userId, CheckinType checkinType, LocalDate checkinDate,
                        BigDecimal sleepHours, Integer sleepQuality, Integer condition,
                        Integer focusScore, Integer impulsivityScore, Integer emotionScore,
                        String memo) {
        this.userId = userId;
        this.checkinType = checkinType;
        this.checkinDate = checkinDate;
        this.sleepHours = sleepHours;
        this.sleepQuality = sleepQuality;
        this.condition = condition;
        this.focusScore = focusScore;
        this.impulsivityScore = impulsivityScore;
        this.emotionScore = emotionScore;
        this.memo = memo;
    }
}
