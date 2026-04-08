package com.brainquest.gate.dto;

import com.brainquest.gate.entity.TestType;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * ASRS 스크리닝 제출 요청.
 *
 * @param testType 검사 유형 (ASRS_6 / ASRS_18)
 * @param answers  문항별 응답 (예: {"q1": 3, "q2": 4, ...})
 */
public record ScreeningRequest(
        @NotNull(message = "testType은 필수입니다.") TestType testType,
        @NotNull(message = "answers는 필수입니다.") Map<String, Integer> answers
) {
}
