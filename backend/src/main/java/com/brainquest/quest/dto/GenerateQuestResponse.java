package com.brainquest.quest.dto;

import com.brainquest.quest.entity.Grade;

import java.util.List;

public record GenerateQuestResponse(
        String originalTitle,
        String questTitle,
        String questStory,
        Grade grade,
        int estimatedMin,
        int expReward,
        int goldReward,
        List<CheckpointResponse> checkpoints
) {
}
