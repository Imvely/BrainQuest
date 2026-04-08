package com.brainquest.quest.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CheckpointRequest(
        @NotBlank(message = "title은 필수입니다.") String title,
        @NotNull(message = "estimatedMin은 필수입니다.") Integer estimatedMin
) {
}
