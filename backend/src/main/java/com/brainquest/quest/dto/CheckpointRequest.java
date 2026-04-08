package com.brainquest.quest.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CheckpointRequest(
        @NotBlank(message = "title은 필수입니다.")
        @Size(max = 300, message = "title은 300자 이하여야 합니다.")
        String title,

        @NotNull(message = "estimatedMin은 필수입니다.")
        @Min(value = 1, message = "estimatedMin은 1 이상이어야 합니다.")
        Integer estimatedMin
) {
}
