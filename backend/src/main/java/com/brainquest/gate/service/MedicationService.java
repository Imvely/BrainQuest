package com.brainquest.gate.service;

import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.common.exception.UnauthorizedException;
import com.brainquest.event.events.MedLogCompletedEvent;
import com.brainquest.gate.dto.MedLogRequest;
import com.brainquest.gate.dto.MedLogResponse;
import com.brainquest.gate.dto.MedicationRequest;
import com.brainquest.gate.dto.MedicationResponse;
import com.brainquest.gate.entity.MedLog;
import com.brainquest.gate.entity.Medication;
import com.brainquest.gate.repository.MedLogRepository;
import com.brainquest.gate.repository.MedicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 약물 관리 서비스.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MedicationService {

    private static final int MED_LOG_EXP = 5;

    private final MedicationRepository medicationRepository;
    private final MedLogRepository medLogRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 약물을 등록한다.
     */
    @Transactional
    public MedicationResponse registerMedication(Long userId, MedicationRequest request) {
        Medication medication = Medication.builder()
                .userId(userId)
                .medName(request.medName())
                .dosage(request.dosage())
                .scheduleTime(request.scheduleTime())
                .build();

        medication = medicationRepository.save(medication);
        return MedicationResponse.from(medication);
    }

    /**
     * 사용자의 활성 약물 목록을 조회한다.
     */
    public List<MedicationResponse> getActiveMedications(Long userId) {
        return medicationRepository.findAllByUserIdAndActiveTrue(userId).stream()
                .map(MedicationResponse::from)
                .toList();
    }

    /**
     * 약물 복용 기록을 저장한다.
     */
    @Transactional
    public MedLogResponse logMedication(Long userId, MedLogRequest request) {
        Medication medication = medicationRepository.findById(request.medicationId())
                .orElseThrow(() -> new EntityNotFoundException("GATE_002", "약물 정보를 찾을 수 없습니다."));

        if (!medication.getUserId().equals(userId)) {
            throw new UnauthorizedException("GATE_003", "해당 약물에 대한 권한이 없습니다.");
        }

        MedLog medLog = MedLog.builder()
                .medicationId(request.medicationId())
                .userId(userId)
                .logDate(LocalDate.now())
                .takenAt(LocalDateTime.now())
                .effectiveness(request.effectiveness())
                .sideEffects(request.sideEffects())
                .build();

        medLog = medLogRepository.save(medLog);

        eventPublisher.publishEvent(new MedLogCompletedEvent(this, userId, MED_LOG_EXP));

        return MedLogResponse.from(medLog);
    }
}
