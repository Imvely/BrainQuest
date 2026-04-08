package com.brainquest.battle.dto;

import com.brainquest.battle.entity.BattleSession;

public record StartBattleResponse(
        Long sessionId,
        MonsterResponse monster,
        int plannedMin
) {
    public static StartBattleResponse from(BattleSession session) {
        return new StartBattleResponse(
                session.getId(),
                new MonsterResponse(session.getMonsterType(), session.getMonsterMaxHp()),
                session.getPlannedMin()
        );
    }
}
