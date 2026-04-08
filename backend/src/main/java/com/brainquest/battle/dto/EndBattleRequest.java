package com.brainquest.battle.dto;

import com.brainquest.battle.entity.BattleResult;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record EndBattleRequest(
        @NotNull BattleResult result,
        @NotNull @Min(0) Integer maxCombo
) {
}
