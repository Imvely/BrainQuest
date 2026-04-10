package com.brainquest.gate.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.util.List;

/**
 * 약물 복용 기록 수정 요청 (부분 업데이트).
 * <p>약효 평가({@code effectiveness})와 부작용({@code sideEffects})을 나중에 추가/변경할 때 사용.</p>
 */
public record MedLogUpdateRequest(
        @Min(value = 1, message = "effectiveness는 1~3 범위여야 합니다.")
        @Max(value = 3, message = "effectiveness는 1~3 범위여야 합니다.")
        Integer effectiveness,
        List<String> sideEffects
) {
}
