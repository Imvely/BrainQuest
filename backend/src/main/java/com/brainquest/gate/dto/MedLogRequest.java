package com.brainquest.gate.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

/**
 * 약물 복용 기록 요청.
 */
public record MedLogRequest(
        @NotNull(message = "medicationId는 필수입니다.") Long medicationId,
        Integer effectiveness,
        List<String> sideEffects
) {
}
