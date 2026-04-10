package com.brainquest.gate.service;

import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.common.exception.UnauthorizedException;
import com.brainquest.event.events.MedLogCompletedEvent;
import com.brainquest.gate.dto.MedLogRequest;
import com.brainquest.gate.dto.MedLogResponse;
import com.brainquest.gate.dto.MedLogUpdateRequest;
import com.brainquest.gate.dto.MedicationRequest;
import com.brainquest.gate.dto.MedicationResponse;
import com.brainquest.gate.dto.MedicationUpdateRequest;
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
     * 사용자의 전체 약물 목록을 조회한다 (비활성 포함, scheduleTime 오름차순).
     */
    public List<MedicationResponse> getAllMedications(Long userId) {
        return medicationRepository.findAllByUserIdOrderByScheduleTime(userId).stream()
                .map(MedicationResponse::from)
                .toList();
    }

    /**
     * 약물 정보를 부분 업데이트한다 (활성/비활성 토글 포함).
     */
    @Transactional
    public MedicationResponse updateMedication(Long userId, Long medicationId, MedicationUpdateRequest request) {
        Medication medication = medicationRepository.findByIdAndUserId(medicationId, userId)
                .orElseThrow(() -> new EntityNotFoundException("GATE_002", "약물 정보를 찾을 수 없습니다."));

        medication.update(request.medName(), request.dosage(), request.scheduleTime(), request.active());
        // dirty checking으로 자동 플러시됨
        return MedicationResponse.from(medication);
    }

    /**
     * 약물을 삭제한다.
     * <p>주의: DB 제약({@code ON DELETE CASCADE})에 의해 해당 약물의 복용 기록({@code med_logs})도 함께 삭제된다.
     * 기록을 보존하려면 {@link #updateMedication}로 {@code active=false} 설정(소프트 삭제)을 권장한다.</p>
     */
    @Transactional
    public void deleteMedication(Long userId, Long medicationId) {
        Medication medication = medicationRepository.findByIdAndUserId(medicationId, userId)
                .orElseThrow(() -> new EntityNotFoundException("GATE_002", "약물 정보를 찾을 수 없습니다."));
        medicationRepository.delete(medication);
    }

    /**
     * 복용 기록의 약효/부작용 정보를 부분 업데이트한다.
     * <p>복용 즉시에는 {@code effectiveness}가 null인 경우가 많아 나중에 추가 평가할 때 사용.</p>
     */
    @Transactional
    public MedLogResponse updateMedLog(Long userId, Long medLogId, MedLogUpdateRequest request) {
        MedLog medLog = medLogRepository.findByIdAndUserId(medLogId, userId)
                .orElseThrow(() -> new EntityNotFoundException("GATE_004", "복용 기록을 찾을 수 없습니다."));

        medLog.updateEvaluation(request.effectiveness(), request.sideEffects());
        return MedLogResponse.from(medLog);
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
