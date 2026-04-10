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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("MedicationService 단위 테스트")
class MedicationServiceTest {

    @InjectMocks
    private MedicationService medicationService;

    @Mock
    private MedicationRepository medicationRepository;

    @Mock
    private MedLogRepository medLogRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    // --- registerMedication ---

    @Nested
    @DisplayName("registerMedication")
    class RegisterMedication {

        @Test
        @DisplayName("정상 — 약물 저장 후 응답 반환")
        void success() {
            // given
            Long userId = 1L;
            MedicationRequest request = new MedicationRequest("콘서타", "27mg", LocalTime.of(8, 0));

            given(medicationRepository.save(any(Medication.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            MedicationResponse response = medicationService.registerMedication(userId, request);

            // then
            assertThat(response.medName()).isEqualTo("콘서타");
            assertThat(response.dosage()).isEqualTo("27mg");
            assertThat(response.scheduleTime()).isEqualTo(LocalTime.of(8, 0));
            assertThat(response.active()).isTrue();
        }

        @Test
        @DisplayName("저장 엔티티 필드 검증")
        void savesCorrectEntity() {
            // given
            Long userId = 3L;
            MedicationRequest request = new MedicationRequest("메디키넷", "10mg", LocalTime.of(7, 30));

            given(medicationRepository.save(any(Medication.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            medicationService.registerMedication(userId, request);

            // then
            ArgumentCaptor<Medication> captor = ArgumentCaptor.forClass(Medication.class);
            verify(medicationRepository).save(captor.capture());

            Medication saved = captor.getValue();
            assertThat(saved.getUserId()).isEqualTo(3L);
            assertThat(saved.getMedName()).isEqualTo("메디키넷");
        }
    }

    // --- getActiveMedications ---

    @Nested
    @DisplayName("getActiveMedications")
    class GetActiveMedications {

        @Test
        @DisplayName("활성 약물 목록 반환")
        void returnsList() {
            // given
            Long userId = 1L;
            Medication med = Medication.builder()
                    .userId(userId).medName("콘서타").dosage("27mg")
                    .scheduleTime(LocalTime.of(8, 0)).build();

            given(medicationRepository.findAllByUserIdAndActiveTrue(userId))
                    .willReturn(List.of(med));

            // when
            List<MedicationResponse> result = medicationService.getActiveMedications(userId);

            // then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).medName()).isEqualTo("콘서타");
        }

        @Test
        @DisplayName("활성 약물 없으면 빈 목록")
        void returnsEmpty() {
            // given
            given(medicationRepository.findAllByUserIdAndActiveTrue(99L))
                    .willReturn(Collections.emptyList());

            // when
            List<MedicationResponse> result = medicationService.getActiveMedications(99L);

            // then
            assertThat(result).isEmpty();
        }
    }

    // --- logMedication ---

    @Nested
    @DisplayName("logMedication")
    class LogMedication {

        @Test
        @DisplayName("정상 — 복용 기록 저장 + 경험치 5 지급")
        void success() {
            // given
            Long userId = 1L;
            MedLogRequest request = new MedLogRequest(10L, 3, List.of("식욕감소"));

            Medication medication = Medication.builder()
                    .userId(userId).medName("콘서타").dosage("27mg")
                    .scheduleTime(LocalTime.of(8, 0)).build();
            given(medicationRepository.findById(10L)).willReturn(Optional.of(medication));

            given(medLogRepository.save(any(MedLog.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            MedLogResponse response = medicationService.logMedication(userId, request);

            // then
            assertThat(response.medicationId()).isEqualTo(10L);
            assertThat(response.effectiveness()).isEqualTo(3);
            assertThat(response.sideEffects()).containsExactly("식욕감소");

            verify(eventPublisher).publishEvent(any(MedLogCompletedEvent.class));
        }

        @Test
        @DisplayName("부작용/효과 없이 기록")
        void withoutOptionalFields() {
            // given
            Long userId = 1L;
            MedLogRequest request = new MedLogRequest(10L, null, null);

            Medication medication = Medication.builder()
                    .userId(userId).medName("콘서타").dosage("27mg")
                    .scheduleTime(LocalTime.of(8, 0)).build();
            given(medicationRepository.findById(10L)).willReturn(Optional.of(medication));

            given(medLogRepository.save(any(MedLog.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            MedLogResponse response = medicationService.logMedication(userId, request);

            // then
            assertThat(response.effectiveness()).isNull();
            assertThat(response.sideEffects()).isNull();
        }

        @Test
        @DisplayName("존재하지 않는 약물 ID — EntityNotFoundException")
        void medicationNotFound_throwsException() {
            // given
            Long userId = 1L;
            MedLogRequest request = new MedLogRequest(999L, null, null);

            given(medicationRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> medicationService.logMedication(userId, request))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("약물 정보를 찾을 수 없습니다.");

            verify(medLogRepository, never()).save(any());
            verify(eventPublisher, never()).publishEvent(any());
        }

        @Test
        @DisplayName("타 사용자의 약물 — UnauthorizedException")
        void otherUsersMedication_throwsUnauthorized() {
            // given
            Long userId = 1L;
            MedLogRequest request = new MedLogRequest(10L, null, null);

            Medication otherUserMed = Medication.builder()
                    .userId(999L).medName("콘서타").dosage("27mg")
                    .scheduleTime(LocalTime.of(8, 0)).build();
            given(medicationRepository.findById(10L)).willReturn(Optional.of(otherUserMed));

            // when & then
            assertThatThrownBy(() -> medicationService.logMedication(userId, request))
                    .isInstanceOf(UnauthorizedException.class)
                    .hasMessageContaining("권한이 없습니다.");

            verify(medLogRepository, never()).save(any());
        }
    }

    // --- getAllMedications ---

    @Nested
    @DisplayName("getAllMedications")
    class GetAllMedications {

        @Test
        @DisplayName("비활성 포함 전체 목록 반환 (scheduleTime 오름차순)")
        void returnsAll() {
            Long userId = 1L;
            Medication m1 = Medication.builder()
                    .userId(userId).medName("콘서타").dosage("27mg")
                    .scheduleTime(LocalTime.of(8, 0)).build();
            Medication m2 = Medication.builder()
                    .userId(userId).medName("메디키넷").dosage("10mg")
                    .scheduleTime(LocalTime.of(12, 0)).build();

            given(medicationRepository.findAllByUserIdOrderByScheduleTime(userId))
                    .willReturn(List.of(m1, m2));

            List<MedicationResponse> result = medicationService.getAllMedications(userId);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).medName()).isEqualTo("콘서타");
            assertThat(result.get(1).medName()).isEqualTo("메디키넷");
        }
    }

    // --- updateMedication ---

    @Nested
    @DisplayName("updateMedication")
    class UpdateMedication {

        @Test
        @DisplayName("정상 — 용량과 active만 부분 수정")
        void partialUpdate() {
            Long userId = 1L;
            Medication existing = Medication.builder()
                    .userId(userId).medName("콘서타").dosage("27mg")
                    .scheduleTime(LocalTime.of(8, 0)).build();

            given(medicationRepository.findByIdAndUserId(10L, userId))
                    .willReturn(Optional.of(existing));

            MedicationUpdateRequest request =
                    new MedicationUpdateRequest(null, "36mg", null, false);

            MedicationResponse response =
                    medicationService.updateMedication(userId, 10L, request);

            // dirty checking으로 인해 existing 엔티티가 직접 변경됨
            assertThat(response.dosage()).isEqualTo("36mg");
            assertThat(response.active()).isFalse();
            assertThat(response.medName()).isEqualTo("콘서타"); // 미변경
            assertThat(response.scheduleTime()).isEqualTo(LocalTime.of(8, 0)); // 미변경
        }

        @Test
        @DisplayName("존재하지 않는 약물 — EntityNotFoundException")
        void notFound() {
            given(medicationRepository.findByIdAndUserId(999L, 1L))
                    .willReturn(Optional.empty());

            MedicationUpdateRequest request =
                    new MedicationUpdateRequest(null, "36mg", null, null);

            assertThatThrownBy(() -> medicationService.updateMedication(1L, 999L, request))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("약물 정보를 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("타 사용자의 약물 — 조회 실패 (findByIdAndUserId에서 걸러짐)")
        void otherUser() {
            // findByIdAndUserId는 userId 불일치 시 Optional.empty 반환 → EntityNotFoundException
            given(medicationRepository.findByIdAndUserId(10L, 1L))
                    .willReturn(Optional.empty());

            MedicationUpdateRequest request =
                    new MedicationUpdateRequest("new", null, null, null);

            assertThatThrownBy(() -> medicationService.updateMedication(1L, 10L, request))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // --- deleteMedication ---

    @Nested
    @DisplayName("deleteMedication")
    class DeleteMedication {

        @Test
        @DisplayName("정상 — 약물 삭제")
        void success() {
            Long userId = 1L;
            Medication existing = Medication.builder()
                    .userId(userId).medName("콘서타").dosage("27mg")
                    .scheduleTime(LocalTime.of(8, 0)).build();

            given(medicationRepository.findByIdAndUserId(10L, userId))
                    .willReturn(Optional.of(existing));

            medicationService.deleteMedication(userId, 10L);

            verify(medicationRepository).delete(existing);
        }

        @Test
        @DisplayName("존재하지 않는 약물 — EntityNotFoundException")
        void notFound() {
            given(medicationRepository.findByIdAndUserId(999L, 1L))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> medicationService.deleteMedication(1L, 999L))
                    .isInstanceOf(EntityNotFoundException.class);

            verify(medicationRepository, never()).delete(any());
        }
    }

    // --- updateMedLog ---

    @Nested
    @DisplayName("updateMedLog")
    class UpdateMedLog {

        @Test
        @DisplayName("정상 — 약효/부작용 부분 업데이트")
        void success() {
            Long userId = 1L;
            MedLog existing = MedLog.builder()
                    .medicationId(10L).userId(userId)
                    .logDate(java.time.LocalDate.now())
                    .takenAt(java.time.LocalDateTime.now())
                    .build();

            given(medLogRepository.findByIdAndUserId(100L, userId))
                    .willReturn(Optional.of(existing));

            MedLogUpdateRequest request = new MedLogUpdateRequest(3, List.of("두통"));

            MedLogResponse response =
                    medicationService.updateMedLog(userId, 100L, request);

            assertThat(response.effectiveness()).isEqualTo(3);
            assertThat(response.sideEffects()).containsExactly("두통");
        }

        @Test
        @DisplayName("존재하지 않는 복용 기록 — EntityNotFoundException")
        void notFound() {
            given(medLogRepository.findByIdAndUserId(999L, 1L))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> medicationService.updateMedLog(
                    1L, 999L, new MedLogUpdateRequest(3, null)))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("복용 기록을 찾을 수 없습니다.");
        }
    }
}
