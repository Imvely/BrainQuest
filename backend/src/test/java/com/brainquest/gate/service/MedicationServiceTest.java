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
}
