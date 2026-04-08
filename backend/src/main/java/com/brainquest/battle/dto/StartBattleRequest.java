package com.brainquest.battle.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record StartBattleRequest(
        @NotNull @Min(5) @Max(60) Integer plannedMin,
        Long questId,
        Long checkpointId
) {
}
