package com.brainquest.battle.dto;

import com.brainquest.battle.entity.PenaltyType;

public record ReturnResponse(
        PenaltyType penaltyType,
        int durationSec,
        int monsterRemainingHp,
        int remainingTimeSec
) {
}
