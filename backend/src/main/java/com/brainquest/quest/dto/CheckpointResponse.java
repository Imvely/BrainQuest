package com.brainquest.quest.dto;

import com.brainquest.quest.entity.Checkpoint;
import com.brainquest.quest.entity.CheckpointStatus;

import java.time.LocalDateTime;

public record CheckpointResponse(
        Long id,
        int orderNum,
        String title,
        int estimatedMin,
        int expReward,
        int goldReward,
        CheckpointStatus status,
        LocalDateTime completedAt
) {
    public static CheckpointResponse from(Checkpoint cp) {
        return new CheckpointResponse(
                cp.getId(),
                cp.getOrderNum(),
                cp.getTitle(),
                cp.getEstimatedMin(),
                cp.getExpReward(),
                cp.getGoldReward(),
                cp.getStatus(),
                cp.getCompletedAt()
        );
    }
}
