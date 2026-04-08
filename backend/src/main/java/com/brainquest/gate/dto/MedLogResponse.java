package com.brainquest.gate.dto;

import com.brainquest.gate.entity.MedLog;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 약물 복용 기록 응답.
 */
public record MedLogResponse(
        Long id,
        Long medicationId,
        LocalDate logDate,
        LocalDateTime takenAt,
        Integer effectiveness,
        List<String> sideEffects
) {
    public static MedLogResponse from(MedLog entity) {
        return new MedLogResponse(
                entity.getId(), entity.getMedicationId(), entity.getLogDate(),
                entity.getTakenAt(), entity.getEffectiveness(), entity.getSideEffects());
    }
}
