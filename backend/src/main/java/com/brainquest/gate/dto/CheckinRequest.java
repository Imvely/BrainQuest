package com.brainquest.gate.dto;

import com.brainquest.gate.entity.CheckinType;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/**
 * 체크인 요청 DTO.
 * <p>{@code type}에 따라 아침(MORNING) 또는 저녁(EVENING) 필드를 사용한다.</p>
 *
 * @param type             체크인 유형 (MORNING / EVENING)
 * @param sleepHours       수면 시간 — MORNING 전용
 * @param sleepQuality     수면 질 1-3 — MORNING 전용
 * @param condition        컨디션 1-5 — MORNING 전용
 * @param focusScore       집중력 1-5 — EVENING 전용
 * @param impulsivityScore 충동성 1-5 — EVENING 전용
 * @param emotionScore     감정 안정도 1-5 — EVENING 전용
 * @param memo             메모 — 공통
 */
public record CheckinRequest(
        @NotNull(message = "type은 필수입니다.") CheckinType type,
        BigDecimal sleepHours,
        Integer sleepQuality,
        Integer condition,
        Integer focusScore,
        Integer impulsivityScore,
        Integer emotionScore,
        String memo
) {
}
