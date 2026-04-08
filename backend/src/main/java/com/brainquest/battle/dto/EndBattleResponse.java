package com.brainquest.battle.dto;

import com.brainquest.battle.entity.BattleResult;
import com.brainquest.character.dto.UserItemResponse;

public record EndBattleResponse(
        BattleResult result,
        int actualMin,
        int expEarned,
        int goldEarned,
        int maxCombo,
        int exitCount,
        boolean perfectFocus,
        Integer levelUp,
        UserItemResponse itemDrop
) {
}
