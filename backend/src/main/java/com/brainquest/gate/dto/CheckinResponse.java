package com.brainquest.gate.dto;

import com.brainquest.gate.entity.CheckinType;
import com.brainquest.gate.entity.DailyCheckin;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 체크인 응답.
 */
public record CheckinResponse(
        Long id,
        CheckinType type,
        LocalDate checkinDate,
        BigDecimal sleepHours,
        Integer sleepQuality,
        Integer condition,
        Integer focusScore,
        Integer impulsivityScore,
        Integer emotionScore,
        String memo,
        int streakCount,
        int expReward
) {
    public static CheckinResponse of(DailyCheckin entity, int streakCount, int expReward) {
        return new CheckinResponse(
                entity.getId(), entity.getCheckinType(), entity.getCheckinDate(),
                entity.getSleepHours(), entity.getSleepQuality(), entity.getCondition(),
                entity.getFocusScore(), entity.getImpulsivityScore(), entity.getEmotionScore(),
                entity.getMemo(), streakCount, expReward);
    }
}
