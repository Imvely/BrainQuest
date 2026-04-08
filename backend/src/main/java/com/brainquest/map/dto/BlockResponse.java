package com.brainquest.map.dto;

import com.brainquest.map.entity.BlockCategory;
import com.brainquest.map.entity.BlockSource;
import com.brainquest.map.entity.BlockStatus;
import com.brainquest.map.entity.TimeBlock;

import java.time.LocalDate;
import java.time.LocalTime;

public record BlockResponse(
        Long id,
        LocalDate blockDate,
        LocalTime startTime,
        LocalTime endTime,
        BlockCategory category,
        String title,
        Long questId,
        BlockStatus status,
        BlockSource source
) {
    public static BlockResponse from(TimeBlock block) {
        return new BlockResponse(
                block.getId(),
                block.getBlockDate(),
                block.getStartTime(),
                block.getEndTime(),
                block.getCategory(),
                block.getTitle(),
                block.getQuestId(),
                block.getStatus(),
                block.getSource()
        );
    }
}
