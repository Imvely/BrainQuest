package com.brainquest.gate.dto;

import com.brainquest.gate.entity.Streak;
import com.brainquest.gate.entity.StreakType;

import java.time.LocalDate;

/**
 * 스트릭 조회 응답.
 */
public record StreakResponse(
        StreakType streakType,
        int currentCount,
        int maxCount,
        LocalDate lastDate
) {
    public static StreakResponse from(Streak entity) {
        return new StreakResponse(
                entity.getStreakType(), entity.getCurrentCount(),
                entity.getMaxCount(), entity.getLastDate());
    }
}
