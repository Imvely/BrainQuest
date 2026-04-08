package com.brainquest.quest.dto;

import com.brainquest.quest.entity.Grade;
import com.brainquest.quest.entity.Quest;
import com.brainquest.quest.entity.QuestCategory;
import com.brainquest.quest.entity.QuestStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record QuestDetailResponse(
        Long id,
        String originalTitle,
        String questTitle,
        String questStory,
        QuestCategory category,
        Grade grade,
        QuestStatus status,
        int estimatedMin,
        int expReward,
        int goldReward,
        LocalDate dueDate,
        LocalDateTime completedAt,
        LocalDateTime createdAt,
        List<CheckpointResponse> checkpoints
) {
    public static QuestDetailResponse of(Quest quest, List<CheckpointResponse> checkpoints) {
        return new QuestDetailResponse(
                quest.getId(),
                quest.getOriginalTitle(),
                quest.getQuestTitle(),
                quest.getQuestStory(),
                quest.getCategory(),
                quest.getGrade(),
                quest.getStatus(),
                quest.getEstimatedMin(),
                quest.getExpReward(),
                quest.getGoldReward(),
                quest.getDueDate(),
                quest.getCompletedAt(),
                quest.getCreatedAt(),
                checkpoints
        );
    }
}
