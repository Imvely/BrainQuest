package com.brainquest.battle.dto;

import com.brainquest.battle.entity.BattleResult;
import com.brainquest.battle.entity.BattleSession;

import java.time.LocalDateTime;

public record BattleHistoryResponse(
        Long id,
        String questTitle,
        int plannedMin,
        Integer actualMin,
        BattleResult result,
        int expEarned,
        LocalDateTime startedAt
) {
    public static BattleHistoryResponse of(BattleSession session, String questTitle) {
        return new BattleHistoryResponse(
                session.getId(),
                questTitle,
                session.getPlannedMin(),
                session.getActualMin(),
                session.getResult(),
                session.getExpEarned(),
                session.getStartedAt()
        );
    }
}
