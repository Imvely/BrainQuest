package com.brainquest.gate.dto;

import jakarta.validation.constraints.Size;

import java.time.LocalTime;

/**
 * 약물 정보 수정 요청 (부분 업데이트).
 * <p>모든 필드는 선택적이며 null이 아닌 필드만 반영된다.</p>
 */
public record MedicationUpdateRequest(
        @Size(max = 100, message = "medName은 100자 이하여야 합니다.") String medName,
        @Size(max = 50, message = "dosage는 50자 이하여야 합니다.") String dosage,
        LocalTime scheduleTime,
        Boolean active
) {
}
