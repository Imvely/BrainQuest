package com.brainquest.sky.dto;

import com.brainquest.sky.entity.WeatherType;

import java.time.LocalDate;
import java.util.Map;

public record WeeklySummaryResponse(
        LocalDate weekStart,
        LocalDate weekEnd,
        Map<WeatherType, Integer> distribution,
        Map<WeatherType, Integer> comparedToLastWeek,
        int totalRecords,
        double avgWeatherValue
) {}
