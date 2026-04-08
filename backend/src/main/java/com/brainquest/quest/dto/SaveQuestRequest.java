package com.brainquest.quest.dto;

import com.brainquest.quest.entity.Grade;
import com.brainquest.quest.entity.QuestCategory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record SaveQuestRequest(
        @NotBlank(message = "originalTitle은 필수입니다.") String originalTitle,
        @NotBlank(message = "questTitle은 필수입니다.") String questTitle,
        @NotBlank(message = "questStory는 필수입니다.") String questStory,
        @NotNull(message = "category는 필수입니다.") QuestCategory category,
        @NotNull(message = "grade는 필수입니다.") Grade grade,
        @NotNull(message = "estimatedMin은 필수입니다.") Integer estimatedMin,
        LocalDate dueDate,
        @NotEmpty(message = "checkpoints는 최소 1개 이상이어야 합니다.") @Valid List<CheckpointRequest> checkpoints
) {
}
