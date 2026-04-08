package com.brainquest.map.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RecordActualRequest(
        @NotNull(message = "actualMin은 필수입니다.") @Min(value = 1, message = "actualMin은 1 이상이어야 합니다.") Integer actualMin
) {
}
