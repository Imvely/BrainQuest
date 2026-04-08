package com.brainquest.gate.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 연속 기록(스트릭) 엔티티.
 */
@Entity
@Table(name = "streaks",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "streak_type"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Streak {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "streak_type", length = 20, nullable = false)
    private StreakType streakType;

    @Column(name = "current_count", nullable = false)
    private int currentCount = 0;

    @Column(name = "max_count", nullable = false)
    private int maxCount = 0;

    @Column(name = "last_date")
    private LocalDate lastDate;

    @Version
    @Column(name = "version", nullable = false)
    private int version;

    @Builder
    public Streak(Long userId, StreakType streakType) {
        this.userId = userId;
        this.streakType = streakType;
    }

    /**
     * 오늘 날짜 기준으로 스트릭을 갱신한다.
     *
     * @param today 오늘 날짜
     * @return 갱신 후 현재 연속 일수
     */
    public int recordToday(LocalDate today) {
        if (today.equals(this.lastDate)) {
            return this.currentCount;
        }

        LocalDate yesterday = today.minusDays(1);
        if (yesterday.equals(this.lastDate)) {
            this.currentCount++;
        } else {
            this.currentCount = 1;
        }

        this.maxCount = Math.max(this.currentCount, this.maxCount);
        this.lastDate = today;
        return this.currentCount;
    }
}
