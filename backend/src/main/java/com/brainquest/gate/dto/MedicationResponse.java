package com.brainquest.gate.dto;

import com.brainquest.gate.entity.Medication;

import java.time.LocalTime;

/**
 * 약물 정보 응답.
 */
public record MedicationResponse(
        Long id,
        String medName,
        String dosage,
        LocalTime scheduleTime,
        boolean active
) {
    public static MedicationResponse from(Medication entity) {
        return new MedicationResponse(
                entity.getId(), entity.getMedName(), entity.getDosage(),
                entity.getScheduleTime(), entity.isActive());
    }
}
