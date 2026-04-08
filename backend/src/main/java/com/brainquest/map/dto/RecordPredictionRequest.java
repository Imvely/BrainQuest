package com.brainquest.map.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RecordPredictionRequest(
        @NotNull(message = "blockId는 필수입니다.") Long blockId,
        @NotNull(message = "predictedMin은 필수입니다.") @Min(value = 1, message = "predictedMin은 1 이상이어야 합니다.") Integer predictedMin
) {
}
