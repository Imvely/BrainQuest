package com.brainquest.gate.dto;

import com.brainquest.gate.entity.RiskLevel;
import com.brainquest.gate.entity.ScreeningResult;
import com.brainquest.gate.entity.TestType;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * 스크리닝 결과 응답.
 */
public record ScreeningResponse(
        Long id,
        TestType testType,
        Map<String, Integer> answers,
        int totalScore,
        RiskLevel riskLevel,
        LocalDateTime createdAt
) {
    public static ScreeningResponse from(ScreeningResult entity) {
        return new ScreeningResponse(
                entity.getId(), entity.getTestType(), entity.getAnswers(),
                entity.getTotalScore(), entity.getRiskLevel(), entity.getCreatedAt());
    }
}
