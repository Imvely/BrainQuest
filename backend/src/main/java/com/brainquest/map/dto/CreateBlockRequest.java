package com.brainquest.map.dto;

import com.brainquest.map.entity.BlockCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;

public record CreateBlockRequest(
        @NotNull(message = "blockDate는 필수입니다.") LocalDate blockDate,
        @NotNull(message = "startTime은 필수입니다.") LocalTime startTime,
        @NotNull(message = "endTime은 필수입니다.") LocalTime endTime,
        @NotNull(message = "category는 필수입니다.") BlockCategory category,
        @NotBlank(message = "title은 필수입니다.") String title,
        Long questId
) {
}
