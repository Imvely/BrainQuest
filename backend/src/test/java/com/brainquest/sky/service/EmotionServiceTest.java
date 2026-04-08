package com.brainquest.sky.service;

import com.brainquest.character.entity.StatType;
import com.brainquest.character.service.CharacterService;
import com.brainquest.event.events.EmotionRecordedEvent;
import com.brainquest.sky.dto.*;
import com.brainquest.sky.entity.EmotionRecord;
import com.brainquest.sky.entity.WeatherType;
import com.brainquest.sky.repository.EmotionRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("EmotionService 단위 테스트")
class EmotionServiceTest {

    @InjectMocks
    private EmotionService emotionService;

    @Mock
    private EmotionRecordRepository emotionRecordRepository;

    @Mock
    private CharacterService characterService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    // ── recordEmotion ──

    @Nested
    @DisplayName("recordEmotion")
    class RecordEmotion {

        @Test
        @DisplayName("정상 — 감정 기록 저장 + DEF 경험치 +5 + ���벤트 발행")
        void success() {
            // given
            Long userId = 1L;
            RecordEmotionRequest request = new RecordEmotionRequest(
                    WeatherType.SUNNY, 4, List.of("좋은날"), "기분 좋다",
                    LocalDateTime.of(2026, 4, 8, 14, 30));

            given(emotionRecordRepository.countByUserIdAndRecordedAtBetween(
                    eq(userId), any(), any())).willReturn(2L);
            given(emotionRecordRepository.save(any(EmotionRecord.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            EmotionResponse response = emotionService.recordEmotion(userId, request);

            // then
            assertThat(response.weatherType()).isEqualTo(WeatherType.SUNNY);
            assertThat(response.intensity()).isEqualTo(4);
            assertThat(response.tags()).containsExactly("좋은날");
            assertThat(response.memo()).isEqualTo("기분 좋다");
            assertThat(response.recordedAt()).isEqualTo(
                    LocalDateTime.of(2026, 4, 8, 14, 30));

            verify(characterService).addExp(userId, 5, StatType.DEF);

            ArgumentCaptor<EmotionRecordedEvent> captor =
                    ArgumentCaptor.forClass(EmotionRecordedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().getUserId()).isEqualTo(userId);
            assertThat(captor.getValue().getWeatherType()).isEqualTo(WeatherType.SUNNY);
            assertThat(captor.getValue().getIntensity()).isEqualTo(4);
        }

        @Test
        @DisplayName("정상 — recordedAt null이면 현재 시각 사용")
        void success_nullRecordedAt_usesNow() {
            // given
            Long userId = 1L;
            RecordEmotionRequest request = new RecordEmotionRequest(
                    WeatherType.RAIN, 3, null, null, null);

            given(emotionRecordRepository.countByUserIdAndRecordedAtBetween(
                    eq(userId), any(), any())).willReturn(0L);
            given(emotionRecordRepository.save(any(EmotionRecord.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            EmotionResponse response = emotionService.recordEmotion(userId, request);

            // then
            assertThat(response.weatherType()).isEqualTo(WeatherType.RAIN);
            assertThat(response.recordedAt()).isNotNull();
            verify(emotionRecordRepository).save(any(EmotionRecord.class));
        }

        @Test
        @DisplayName("정상 — 4회 기록 후 5번째까지 허용")
        void success_fifthRecordAllowed() {
            // given
            Long userId = 1L;
            RecordEmotionRequest request = new RecordEmotionRequest(
                    WeatherType.CLOUDY, 2, null, null, null);

            given(emotionRecordRepository.countByUserIdAndRecordedAtBetween(
                    eq(userId), any(), any())).willReturn(4L);
            given(emotionRecordRepository.save(any(EmotionRecord.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            // when
            EmotionResponse response = emotionService.recordEmotion(userId, request);

            // then
            assertThat(response.weatherType()).isEqualTo(WeatherType.CLOUDY);
            verify(emotionRecordRepository).save(any(EmotionRecord.class));
        }

        @Test
        @DisplayName("예외 — 일일 5회 초과 시 IllegalStateException")
        void exceedDailyLimit_throwsException() {
            // given
            Long userId = 1L;
            RecordEmotionRequest request = new RecordEmotionRequest(
                    WeatherType.SUNNY, 3, null, null, null);

            given(emotionRecordRepository.countByUserIdAndRecordedAtBetween(
                    eq(userId), any(), any())).willReturn(5L);

            // when & then
            assertThatThrownBy(() -> emotionService.recordEmotion(userId, request))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("일일 최대 5회");

            verify(emotionRecordRepository, never()).save(any());
            verify(characterService, never()).addExp(anyLong(), anyInt(), any());
            verify(eventPublisher, never()).publishEvent(any());
        }
    }

    // ── getMonthlyCalendar ──

    @Nested
    @DisplayName("getMonthlyCalendar")
    class GetMonthlyCalendar {

        @Test
        @DisplayName("정상 — 날짜별 그룹핑 + 대표 날씨 가중 평균 계산")
        void success_groupsByDateWithDominantWeather() {
            // given
            Long userId = 1L;
            YearMonth yearMonth = YearMonth.of(2026, 4);

            // 4/5: SUNNY(7)*3 + RAIN(3)*1 → weighted=24, totalIntensity=4, avg=6.0 → PARTLY_CLOUDY
            EmotionRecord r1 = buildRecord(WeatherType.SUNNY, 3,
                    LocalDateTime.of(2026, 4, 5, 10, 0));
            EmotionRecord r2 = buildRecord(WeatherType.RAIN, 1,
                    LocalDateTime.of(2026, 4, 5, 15, 0));
            // 4/10: STORM(1)*5 → avg=1.0 → STORM
            EmotionRecord r3 = buildRecord(WeatherType.STORM, 5,
                    LocalDateTime.of(2026, 4, 10, 9, 0));

            given(emotionRecordRepository
                    .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
                            eq(userId), any(), any()))
                    .willReturn(List.of(r1, r2, r3));

            // when
            MonthlyCalendarResponse response =
                    emotionService.getMonthlyCalendar(userId, yearMonth);

            // then
            assertThat(response.yearMonth()).isEqualTo(yearMonth);
            assertThat(response.days()).hasSize(2);

            DayEmotionSummary day1 = response.days().get(0);
            assertThat(day1.date()).isEqualTo(LocalDate.of(2026, 4, 5));
            assertThat(day1.dominantWeather()).isEqualTo(WeatherType.PARTLY_CLOUDY);
            assertThat(day1.recordCount()).isEqualTo(2);
            assertThat(day1.records()).hasSize(2);

            DayEmotionSummary day2 = response.days().get(1);
            assertThat(day2.date()).isEqualTo(LocalDate.of(2026, 4, 10));
            assertThat(day2.dominantWeather()).isEqualTo(WeatherType.STORM);
            assertThat(day2.recordCount()).isEqualTo(1);
        }

        @Test
        @DisplayName("정상 — 기록 없으면 빈 days 반환")
        void success_noRecords_emptyDays() {
            // given
            Long userId = 1L;
            YearMonth yearMonth = YearMonth.of(2026, 3);

            given(emotionRecordRepository
                    .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
                            eq(userId), any(), any()))
                    .willReturn(List.of());

            // when
            MonthlyCalendarResponse response =
                    emotionService.getMonthlyCalendar(userId, yearMonth);

            // then
            assertThat(response.yearMonth()).isEqualTo(yearMonth);
            assertThat(response.days()).isEmpty();
        }

        @Test
        @DisplayName("정상 — 동일 날씨/강도 여러 건 → 해당 날씨가 대표")
        void success_sameWeather_becomesDominant() {
            // given
            Long userId = 1L;
            YearMonth yearMonth = YearMonth.of(2026, 4);

            EmotionRecord r1 = buildRecord(WeatherType.CLOUDY, 3,
                    LocalDateTime.of(2026, 4, 1, 10, 0));
            EmotionRecord r2 = buildRecord(WeatherType.CLOUDY, 4,
                    LocalDateTime.of(2026, 4, 1, 15, 0));

            given(emotionRecordRepository
                    .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
                            eq(userId), any(), any()))
                    .willReturn(List.of(r1, r2));

            // when
            MonthlyCalendarResponse response =
                    emotionService.getMonthlyCalendar(userId, yearMonth);

            // then
            assertThat(response.days()).hasSize(1);
            assertThat(response.days().get(0).dominantWeather()).isEqualTo(WeatherType.CLOUDY);
        }
    }

    // ── getWeeklySummary ──

    @Nested
    @DisplayName("getWeeklySummary")
    class GetWeeklySummary {

        @Test
        @DisplayName("정상 — 이번 주 분포 + 전주 ��교")
        void success_distributionAndComparison() {
            // given
            Long userId = 1L;

            EmotionRecord thisWeek1 = buildRecord(WeatherType.SUNNY, 3,
                    LocalDateTime.now());
            EmotionRecord thisWeek2 = buildRecord(WeatherType.SUNNY, 4,
                    LocalDateTime.now());
            EmotionRecord thisWeek3 = buildRecord(WeatherType.RAIN, 2,
                    LocalDateTime.now());

            EmotionRecord lastWeek1 = buildRecord(WeatherType.SUNNY, 3,
                    LocalDateTime.now().minusWeeks(1));
            EmotionRecord lastWeek2 = buildRecord(WeatherType.CLOUDY, 2,
                    LocalDateTime.now().minusWeeks(1));

            // 이번 주 조회 (첫 번째 호출)
            // 전주 조회 (두 번째 호출)
            given(emotionRecordRepository
                    .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
                            eq(userId), any(), any()))
                    .willReturn(List.of(thisWeek1, thisWeek2, thisWeek3))
                    .willReturn(List.of(lastWeek1, lastWeek2));

            // when
            WeeklySummaryResponse response = emotionService.getWeeklySummary(userId);

            // then
            assertThat(response.totalRecords()).isEqualTo(3);
            assertThat(response.distribution()).containsEntry(WeatherType.SUNNY, 2);
            assertThat(response.distribution()).containsEntry(WeatherType.RAIN, 1);

            // 전주 대비: SUNNY 2-1=+1, RAIN 1-0=+1, CLOUDY 0-1=-1
            assertThat(response.comparedToLastWeek()).containsEntry(WeatherType.SUNNY, 1);
            assertThat(response.comparedToLastWeek()).containsEntry(WeatherType.RAIN, 1);
            assertThat(response.comparedToLastWeek()).containsEntry(WeatherType.CLOUDY, -1);

            // 평균: (7+7+3)/3 = 5.67
            assertThat(response.avgWeatherValue()).isEqualTo(5.67);
        }

        @Test
        @DisplayName("��상 — 기록 없으면 빈 분포 + avgWeatherValue 0.0")
        void success_noRecords() {
            // given
            Long userId = 1L;

            given(emotionRecordRepository
                    .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
                            eq(userId), any(), any()))
                    .willReturn(List.of());

            // when
            WeeklySummaryResponse response = emotionService.getWeeklySummary(userId);

            // then
            assertThat(response.totalRecords()).isEqualTo(0);
            assertThat(response.distribution()).isEmpty();
            assertThat(response.avgWeatherValue()).isEqualTo(0.0);

            // 전주도 기록 없으면 모든 날씨 타입이 0
            for (WeatherType wt : WeatherType.values()) {
                assertThat(response.comparedToLastWeek()).containsEntry(wt, 0);
            }
        }
    }

    // ��─ getEmotionsByDate ─��

    @Nested
    @DisplayName("getEmotionsByDate")
    class GetEmotionsByDate {

        @Test
        @DisplayName("��상 — 해당 날짜 기록 반���")
        void success_returnsRecordsForDate() {
            // given
            Long userId = 1L;
            LocalDate date = LocalDate.of(2026, 4, 8);

            EmotionRecord r1 = buildRecord(WeatherType.SUNNY, 4,
                    LocalDateTime.of(2026, 4, 8, 9, 0));
            EmotionRecord r2 = buildRecord(WeatherType.CLOUDY, 2,
                    LocalDateTime.of(2026, 4, 8, 18, 0));

            given(emotionRecordRepository
                    .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
                            eq(userId), any(), any()))
                    .willReturn(List.of(r1, r2));

            // when
            List<EmotionResponse> responses = emotionService.getEmotionsByDate(userId, date);

            // then
            assertThat(responses).hasSize(2);
            assertThat(responses.get(0).weatherType()).isEqualTo(WeatherType.SUNNY);
            assertThat(responses.get(1).weatherType()).isEqualTo(WeatherType.CLOUDY);
        }

        @Test
        @DisplayName("정상 — 기록 없으면 빈 목�� 반환")
        void success_noRecords_emptyList() {
            // given
            Long userId = 1L;
            LocalDate date = LocalDate.of(2026, 4, 8);

            given(emotionRecordRepository
                    .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
                            eq(userId), any(), any()))
                    .willReturn(List.of());

            // when
            List<EmotionResponse> responses = emotionService.getEmotionsByDate(userId, date);

            // then
            assertThat(responses).isEmpty();
        }
    }

    // ── WeatherType enum ──

    @Nested
    @DisplayName("WeatherType.fromNumericValue")
    class WeatherTypeFromNumericValue {

        @Test
        @DisplayName("정확한 수치 → 해당 날씨 반환")
        void exactValue() {
            assertThat(WeatherType.fromNumericValue(7.0)).isEqualTo(WeatherType.SUNNY);
            assertThat(WeatherType.fromNumericValue(1.0)).isEqualTo(WeatherType.STORM);
            assertThat(WeatherType.fromNumericValue(4.0)).isEqualTo(WeatherType.FOG);
        }

        @Test
        @DisplayName("중간값 → 가장 가까운 날씨 반환")
        void intermediateValue() {
            // 6.0 → PARTLY_CLOUDY(6)
            assertThat(WeatherType.fromNumericValue(6.0)).isEqualTo(WeatherType.PARTLY_CLOUDY);
            // 5.6 → PARTLY_CLOUDY(6) (diff=0.4) vs CLOUDY(5) (diff=0.6)
            assertThat(WeatherType.fromNumericValue(5.6)).isEqualTo(WeatherType.PARTLY_CLOUDY);
            // 2.3 → THUNDER(2) (diff=0.3) vs RAIN(3) (diff=0.7)
            assertThat(WeatherType.fromNumericValue(2.3)).isEqualTo(WeatherType.THUNDER);
        }

        @Test
        @DisplayName("경계값 — 두 날씨 사이 정확히 중간이면 순회 순서상 먼저인 쪽")
        void boundaryValue() {
            // 6.5 → SUNNY(7) diff=0.5, PARTLY_CLOUDY(6) diff=0.5 → SUNNY가 먼저 순회
            assertThat(WeatherType.fromNumericValue(6.5)).isEqualTo(WeatherType.SUNNY);
        }
    }

    // ── helper ──

    private EmotionRecord buildRecord(WeatherType weatherType, int intensity,
                                      LocalDateTime recordedAt) {
        return EmotionRecord.builder()
                .userId(1L)
                .weatherType(weatherType)
                .intensity(intensity)
                .recordedAt(recordedAt)
                .build();
    }
}
