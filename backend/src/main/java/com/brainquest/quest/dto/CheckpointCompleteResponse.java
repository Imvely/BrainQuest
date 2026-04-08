package com.brainquest.quest.dto;

import com.brainquest.character.dto.UserItemResponse;
import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CheckpointCompleteResponse(
        CheckpointResponse checkpoint,
        RewardResponse reward,
        boolean questCompleted,
        UserItemResponse itemDrop
) {
}
