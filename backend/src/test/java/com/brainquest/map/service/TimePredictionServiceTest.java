package com.brainquest.map.service;

import com.brainquest.character.entity.StatType;
import com.brainquest.character.service.CharacterService;
import com.brainquest.common.exception.DuplicateResourceException;
import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.map.dto.PredictionResponse;
import com.brainquest.map.dto.PredictionResultResponse;
import com.brainquest.map.dto.RecordPredictionRequest;
import com.brainquest.map.entity.BlockCategory;
import com.brainquest.map.entity.TimeBlock;
import com.brainquest.map.entity.TimePrediction;
import com.brainquest.map.repository.TimeBlockRepository;
import com.brainquest.map.repository.TimePredictionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TimePredictionService 단위 테스트")
class TimePredictionServiceTest {

    @InjectMocks
    private TimePredictionService timePredictionService;

    @Mock
    private TimePredictionRepository timePredictionRepository;

    @Mock
    private TimeBlockRepository timeBlockRepository;

    @Mock
    private CharacterService characterService;

    // ── 헬퍼 메서드 ──

    private TimeBlock createBlock(Long id, Long userId) {
        TimeBlock block = TimeBlock.builder()
                .userId(userId)
                .blockDate(LocalDate.of(2026, 4, 8))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(10, 0))
                .category(BlockCategory.WORK)
                .title("작업")
                .build();
        ReflectionTestUtils.setField(block, "id", id);
        return block;
    }

    private TimePrediction createPrediction(Long id, Long userId, TimeBlock block, int predictedMin) {
        TimePrediction prediction = TimePrediction.builder()
                .userId(userId)
                .timeBlock(block)
                .predictedMin(predictedMin)
                .build();
        ReflectionTestUtils.setField(prediction, "id", id);
        return prediction;
    }

    // ──────────────────────────────────────────────
    // recordPrediction
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("recordPrediction")
    class RecordPrediction {

        @Test
        @DisplayName("정상 — 시간 예측 기록")
        void success() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlock(10L, userId);
            var req = new RecordPredictionRequest(10L, 30);

            given(timeBlockRepository.findByIdAndUserId(10L, userId)).willReturn(Optional.of(block));
            given(timePredictionRepository.save(any(TimePrediction.class))).willAnswer(inv -> {
                TimePrediction p = inv.getArgument(0);
                ReflectionTestUtils.setField(p, "id", 1L);
                return p;
            });

            // when
            PredictionResponse res = timePredictionService.recordPrediction(userId, req);

            // then
            assertThat(res.id()).isEqualTo(1L);
            assertThat(res.blockId()).isEqualTo(10L);
            assertThat(res.predictedMin()).isEqualTo(30);

            verify(timePredictionRepository).save(any(TimePrediction.class));
        }

        @Test
        @DisplayName("타임블록 없음 — EntityNotFoundException")
        void blockNotFound() {
            given(timeBlockRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

            var req = new RecordPredictionRequest(99L, 30);

            assertThatThrownBy(() -> timePredictionService.recordPrediction(1L, req))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("타임블록을 찾을 수 없습니다");

            verify(timePredictionRepository, never()).save(any());
        }

        @Test
        @DisplayName("다른 사용자의 블록 — EntityNotFoundException")
        void otherUsersBlock() {
            // findByIdAndUserId가 없으면 Optional.empty → EntityNotFoundException
            given(timeBlockRepository.findByIdAndUserId(10L, 1L)).willReturn(Optional.empty());

            var req = new RecordPredictionRequest(10L, 30);

            assertThatThrownBy(() -> timePredictionService.recordPrediction(1L, req))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    // ──────────────────────────────────────────────
    // recordActual
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("recordActual")
    class RecordActual {

        @Test
        @DisplayName("정상 — 정확도 높음 (오차 5분 이내) → AGI 보너스")
        void accurateBonus() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlock(10L, userId);
            TimePrediction prediction = createPrediction(1L, userId, block, 30);

            given(timePredictionRepository.findByIdAndUserId(1L, userId))
                    .willReturn(Optional.of(prediction));

            // when — 실제 28분 (오차 2분, 5분 이내 → 보너스)
            PredictionResultResponse res = timePredictionService.recordActual(userId, 1L, 28);

            // then
            assertThat(res.predictedMin()).isEqualTo(30);
            assertThat(res.actualMin()).isEqualTo(28);
            assertThat(res.expEarned()).isEqualTo(15);
            // accuracy = max(0, 100 - |30-28|/30*100) = max(0, 100 - 6.67) = 93.33
            assertThat(res.accuracyPct()).isEqualByComparingTo(new BigDecimal("93.33"));

            verify(characterService).addExp(userId, 15, StatType.AGI);
            verify(timePredictionRepository).save(prediction);
        }

        @Test
        @DisplayName("정상 — 정확도 정확히 일치 → AGI 보너스")
        void exactMatch() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlock(10L, userId);
            TimePrediction prediction = createPrediction(1L, userId, block, 30);

            given(timePredictionRepository.findByIdAndUserId(1L, userId))
                    .willReturn(Optional.of(prediction));

            // when — 정확히 30분
            PredictionResultResponse res = timePredictionService.recordActual(userId, 1L, 30);

            // then
            assertThat(res.accuracyPct()).isEqualByComparingTo(new BigDecimal("100.00"));
            assertThat(res.expEarned()).isEqualTo(15);

            verify(characterService).addExp(userId, 15, StatType.AGI);
        }

        @Test
        @DisplayName("정상 — 정확도 낮음 (오차 5분 초과) → 보너스 없음")
        void inaccurateNoBonus() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlock(10L, userId);
            TimePrediction prediction = createPrediction(1L, userId, block, 30);

            given(timePredictionRepository.findByIdAndUserId(1L, userId))
                    .willReturn(Optional.of(prediction));

            // when — 실제 45분 (오차 15분, 5분 초과 → 보너스 없음)
            PredictionResultResponse res = timePredictionService.recordActual(userId, 1L, 45);

            // then
            assertThat(res.predictedMin()).isEqualTo(30);
            assertThat(res.actualMin()).isEqualTo(45);
            assertThat(res.expEarned()).isEqualTo(0);
            // accuracy = max(0, 100 - |30-45|/30*100) = max(0, 100 - 50) = 50.00
            assertThat(res.accuracyPct()).isEqualByComparingTo(new BigDecimal("50.00"));

            verify(characterService, never()).addExp(any(), anyInt(), any());
        }

        @Test
        @DisplayName("정상 — 오차 경계값 (정확히 5분 차이) → AGI 보너스")
        void boundaryExactly5() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlock(10L, userId);
            TimePrediction prediction = createPrediction(1L, userId, block, 30);

            given(timePredictionRepository.findByIdAndUserId(1L, userId))
                    .willReturn(Optional.of(prediction));

            // when — 실제 35분 (오차 정확히 5분 → 보너스 O)
            PredictionResultResponse res = timePredictionService.recordActual(userId, 1L, 35);

            // then
            assertThat(res.expEarned()).isEqualTo(15);
            verify(characterService).addExp(userId, 15, StatType.AGI);
        }

        @Test
        @DisplayName("정상 — 오차 경계값 (6분 차이) → 보너스 없음")
        void boundaryExactly6() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlock(10L, userId);
            TimePrediction prediction = createPrediction(1L, userId, block, 30);

            given(timePredictionRepository.findByIdAndUserId(1L, userId))
                    .willReturn(Optional.of(prediction));

            // when — 실제 36분 (오차 6분 → 보너스 X)
            PredictionResultResponse res = timePredictionService.recordActual(userId, 1L, 36);

            // then
            assertThat(res.expEarned()).isEqualTo(0);
            verify(characterService, never()).addExp(any(), anyInt(), any());
        }

        @Test
        @DisplayName("정상 — 실제 시간이 매우 오래 걸림 → 정확도 0%")
        void veryInaccurateFloorZero() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlock(10L, userId);
            TimePrediction prediction = createPrediction(1L, userId, block, 10);

            given(timePredictionRepository.findByIdAndUserId(1L, userId))
                    .willReturn(Optional.of(prediction));

            // when — 예측 10분, 실제 60분 → accuracy = max(0, 100-500) = 0
            PredictionResultResponse res = timePredictionService.recordActual(userId, 1L, 60);

            // then
            assertThat(res.accuracyPct()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(res.expEarned()).isEqualTo(0);
        }

        @Test
        @DisplayName("예측 기록 없음 — EntityNotFoundException")
        void predictionNotFound() {
            given(timePredictionRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> timePredictionService.recordActual(1L, 99L, 30))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("시간 예측 기록을 찾을 수 없습니다");

            verify(characterService, never()).addExp(any(), anyInt(), any());
            verify(timePredictionRepository, never()).save(any());
        }

        @Test
        @DisplayName("이미 실제 시간 기록됨 — DuplicateResourceException")
        void duplicateActual_throwsException() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlock(10L, userId);
            TimePrediction prediction = createPrediction(1L, userId, block, 30);
            prediction.recordActual(28); // 이미 기록됨

            given(timePredictionRepository.findByIdAndUserId(1L, userId))
                    .willReturn(Optional.of(prediction));

            // when & then
            assertThatThrownBy(() -> timePredictionService.recordActual(userId, 1L, 35))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("이미 실제 시간이 기록");

            verify(characterService, never()).addExp(any(), anyInt(), any());
        }
    }
}
