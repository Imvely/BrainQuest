package com.brainquest.map.dto;

import com.brainquest.map.entity.BlockCategory;
import com.brainquest.map.entity.BlockStatus;

import java.time.LocalTime;

public record UpdateBlockRequest(
        LocalTime startTime,
        LocalTime endTime,
        BlockCategory category,
        String title,
        BlockStatus status
) {
}
