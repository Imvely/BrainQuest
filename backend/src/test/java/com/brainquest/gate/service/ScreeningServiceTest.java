package com.brainquest.gate.service;

import com.brainquest.event.events.ScreeningCompletedEvent;
import com.brainquest.gate.dto.ScreeningRequest;
import com.brainquest.gate.dto.ScreeningResponse;
import com.brainquest.gate.entity.RiskLevel;
import com.brainquest.gate.entity.ScreeningResult;
import com.brainquest.gate.entity.TestType;
import com.brainquest.gate.repository.ScreeningResultRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("ScreeningService 단위 테스트")
class ScreeningServiceTest {

    @InjectMocks
    private ScreeningService screeningService;

    @Mock
    private ScreeningResultRepository screeningResultRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Nested
    @DisplayName("submitScreening")
    class SubmitScreening {

        @Test
        @DisplayName("HIGH — 14점 이상이면 riskLevel=HIGH")
        void highRisk() {
            // given
            Long userId = 1L;
            Map<String, Integer> answers = Map.of(
                    "q1", 3, "q2", 3, "q3", 3, "q4", 3, "q5", 1, "q6", 1); // total=14
            ScreeningRequest request = new ScreeningRequest(TestType.ASRS_6, answers);

            given(screeningResultRepository.save(any(ScreeningResult.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            ScreeningResponse response = screeningService.submitScreening(userId, request);

            // then
            assertThat(response.totalScore()).isEqualTo(14);
            assertThat(response.riskLevel()).isEqualTo(RiskLevel.HIGH);
            assertThat(response.testType()).isEqualTo(TestType.ASRS_6);
        }

        @Test
        @DisplayName("MEDIUM — 10~13점이면 riskLevel=MEDIUM")
        void mediumRisk() {
            // given
            Long userId = 1L;
            Map<String, Integer> answers = Map.of(
                    "q1", 2, "q2", 2, "q3", 2, "q4", 2, "q5", 1, "q6", 1); // total=10
            ScreeningRequest request = new ScreeningRequest(TestType.ASRS_6, answers);

            given(screeningResultRepository.save(any(ScreeningResult.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            ScreeningResponse response = screeningService.submitScreening(userId, request);

            // then
            assertThat(response.totalScore()).isEqualTo(10);
            assertThat(response.riskLevel()).isEqualTo(RiskLevel.MEDIUM);
        }

        @Test
        @DisplayName("LOW — 9점 이하면 riskLevel=LOW")
        void lowRisk() {
            // given
            Long userId = 1L;
            Map<String, Integer> answers = Map.of(
                    "q1", 1, "q2", 1, "q3", 1, "q4", 1, "q5", 1, "q6", 1); // total=6
            ScreeningRequest request = new ScreeningRequest(TestType.ASRS_6, answers);

            given(screeningResultRepository.save(any(ScreeningResult.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            ScreeningResponse response = screeningService.submitScreening(userId, request);

            // then
            assertThat(response.totalScore()).isEqualTo(6);
            assertThat(response.riskLevel()).isEqualTo(RiskLevel.LOW);
        }

        @Test
        @DisplayName("저장 후 캐릭터 경험치 30 지급")
        void grantsExp() {
            // given
            Long userId = 5L;
            Map<String, Integer> answers = Map.of("q1", 1);
            ScreeningRequest request = new ScreeningRequest(TestType.ASRS_6, answers);

            given(screeningResultRepository.save(any(ScreeningResult.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            screeningService.submitScreening(userId, request);

            // then
            verify(eventPublisher).publishEvent(any(ScreeningCompletedEvent.class));
        }

        @Test
        @DisplayName("저장되는 엔티티의 필드가 올바른지 검증")
        void savesCorrectEntity() {
            // given
            Long userId = 1L;
            Map<String, Integer> answers = Map.of("q1", 4, "q2", 3);
            ScreeningRequest request = new ScreeningRequest(TestType.ASRS_18, answers);

            given(screeningResultRepository.save(any(ScreeningResult.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            screeningService.submitScreening(userId, request);

            // then
            ArgumentCaptor<ScreeningResult> captor = ArgumentCaptor.forClass(ScreeningResult.class);
            verify(screeningResultRepository).save(captor.capture());

            ScreeningResult saved = captor.getValue();
            assertThat(saved.getUserId()).isEqualTo(1L);
            assertThat(saved.getTestType()).isEqualTo(TestType.ASRS_18);
            assertThat(saved.getTotalScore()).isEqualTo(7);
            assertThat(saved.getAnswers()).isEqualTo(answers);
        }

        @Test
        @DisplayName("빈 answers — IllegalArgumentException")
        void emptyAnswers_throwsException() {
            // given
            ScreeningRequest request = new ScreeningRequest(TestType.ASRS_6, Map.of());

            // when & then
            assertThatThrownBy(() -> screeningService.submitScreening(1L, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("비어있을 수 없습니다");
        }

        @Test
        @DisplayName("답변 값 범위 초과 — IllegalArgumentException")
        void invalidAnswerValue_throwsException() {
            // given
            Map<String, Integer> answers = Map.of("q1", 5); // 0-4 범위 초과
            ScreeningRequest request = new ScreeningRequest(TestType.ASRS_6, answers);

            // when & then
            assertThatThrownBy(() -> screeningService.submitScreening(1L, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("0~4 범위");
        }
    }

    @Nested
    @DisplayName("getHistory")
    class GetHistory {

        @Test
        @DisplayName("기록이 있으면 최신순 목록 반환")
        void returnsHistory() {
            // given
            Long userId = 1L;
            ScreeningResult r1 = ScreeningResult.builder()
                    .userId(userId).testType(TestType.ASRS_6)
                    .answers(Map.of("q1", 3)).totalScore(3).riskLevel(RiskLevel.LOW)
                    .build();
            ScreeningResult r2 = ScreeningResult.builder()
                    .userId(userId).testType(TestType.ASRS_18)
                    .answers(Map.of("q1", 5)).totalScore(5).riskLevel(RiskLevel.LOW)
                    .build();

            given(screeningResultRepository.findAllByUserIdOrderByCreatedAtDesc(userId))
                    .willReturn(List.of(r2, r1));

            // when
            List<ScreeningResponse> history = screeningService.getHistory(userId);

            // then
            assertThat(history).hasSize(2);
            assertThat(history.get(0).testType()).isEqualTo(TestType.ASRS_18);
        }

        @Test
        @DisplayName("기록이 없으면 빈 목록 반환")
        void returnsEmptyList() {
            // given
            given(screeningResultRepository.findAllByUserIdOrderByCreatedAtDesc(99L))
                    .willReturn(Collections.emptyList());

            // when
            List<ScreeningResponse> history = screeningService.getHistory(99L);

            // then
            assertThat(history).isEmpty();
        }
    }
}
