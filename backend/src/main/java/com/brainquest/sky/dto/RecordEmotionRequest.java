package com.brainquest.sky.dto;

import com.brainquest.sky.entity.WeatherType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.List;

public record RecordEmotionRequest(
        @NotNull WeatherType weatherType,
        @NotNull @Min(1) @Max(5) Integer intensity,
        List<String> tags,
        String memo,
        LocalDateTime recordedAt
) {}
