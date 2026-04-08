package com.brainquest.sky.dto;

import com.brainquest.sky.entity.EmotionRecord;
import com.brainquest.sky.entity.WeatherType;

import java.time.LocalDateTime;
import java.util.List;

public record EmotionResponse(
        Long id,
        WeatherType weatherType,
        int intensity,
        List<String> tags,
        String memo,
        LocalDateTime recordedAt
) {
    public static EmotionResponse from(EmotionRecord record) {
        return new EmotionResponse(
                record.getId(),
                record.getWeatherType(),
                record.getIntensity(),
                record.getTags(),
                record.getMemo(),
                record.getRecordedAt()
        );
    }
}
