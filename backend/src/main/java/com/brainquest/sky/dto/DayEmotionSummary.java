package com.brainquest.sky.dto;

import com.brainquest.sky.entity.WeatherType;

import java.time.LocalDate;
import java.util.List;

public record DayEmotionSummary(
        LocalDate date,
        WeatherType dominantWeather,
        int recordCount,
        List<EmotionResponse> records
) {}
