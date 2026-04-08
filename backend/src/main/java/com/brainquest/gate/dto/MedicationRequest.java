package com.brainquest.gate.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

/**
 * 약물 등록 요청.
 */
public record MedicationRequest(
        @NotBlank(message = "medName은 필수입니다.") String medName,
        @NotBlank(message = "dosage는 필수입니다.") String dosage,
        @NotNull(message = "scheduleTime은 필수입니다.") LocalTime scheduleTime
) {
}
