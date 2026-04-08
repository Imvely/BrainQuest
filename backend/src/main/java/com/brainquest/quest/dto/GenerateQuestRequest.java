package com.brainquest.quest.dto;

import com.brainquest.quest.entity.QuestCategory;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record GenerateQuestRequest(
        @NotBlank(message = "originalTitle은 필수입니다.") String originalTitle,
        @NotNull(message = "estimatedMin은 필수입니다.") @Min(value = 5, message = "최소 5분 이상이어야 합니다.") Integer estimatedMin,
        @NotNull(message = "category는 필수입니다.") QuestCategory category
) {
}
