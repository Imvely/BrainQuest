package com.brainquest.quest.dto;

import com.brainquest.quest.entity.Grade;
import com.brainquest.quest.entity.Quest;
import com.brainquest.quest.entity.QuestCategory;
import com.brainquest.quest.entity.QuestStatus;

import java.time.LocalDateTime;

public record QuestResponse(
        Long id,
        String originalTitle,
        String questTitle,
        QuestCategory category,
        Grade grade,
        QuestStatus status,
        int estimatedMin,
        int expReward,
        int goldReward,
        int completedCheckpoints,
        int totalCheckpoints,
        LocalDateTime createdAt
) {
    public static QuestResponse of(Quest quest, int completedCheckpoints, int totalCheckpoints) {
        return new QuestResponse(
                quest.getId(),
                quest.getOriginalTitle(),
                quest.getQuestTitle(),
                quest.getCategory(),
                quest.getGrade(),
                quest.getStatus(),
                quest.getEstimatedMin(),
                quest.getExpReward(),
                quest.getGoldReward(),
                completedCheckpoints,
                totalCheckpoints,
                quest.getCreatedAt()
        );
    }
}
