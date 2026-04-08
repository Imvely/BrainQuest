package com.brainquest.sky.service;

import com.brainquest.character.entity.StatType;
import com.brainquest.character.service.CharacterService;
import com.brainquest.event.events.EmotionRecordedEvent;
import com.brainquest.sky.dto.*;
import com.brainquest.sky.entity.EmotionRecord;
import com.brainquest.sky.entity.WeatherType;
import com.brainquest.sky.repository.EmotionRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EmotionService {

    private static final int DAILY_RECORD_LIMIT = 5;
    private static final int EMOTION_EXP = 5;

    private final EmotionRecordRepository emotionRecordRepository;
    private final CharacterService characterService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 감정을 기록한다.
     * <p>일일 최대 5회 제한. DEF 경험치 +5 지급 및 이벤트 발행.</p>
     */
    @Transactional
    public EmotionResponse recordEmotion(Long userId, RecordEmotionRequest req) {
        // 일일 5회 제한 체크
        LocalDate today = LocalDate.now();
        LocalDateTime dayStart = today.atStartOfDay();
        LocalDateTime dayEnd = today.atTime(LocalTime.MAX);

        long todayCount = emotionRecordRepository.countByUserIdAndRecordedAtBetween(
                userId, dayStart, dayEnd);
        if (todayCount >= DAILY_RECORD_LIMIT) {
            throw new IllegalStateException("일일 최대 5회 기록 가능합니다");
        }

        LocalDateTime recordedAt = req.recordedAt() != null ? req.recordedAt() : LocalDateTime.now();

        EmotionRecord record = EmotionRecord.builder()
                .userId(userId)
                .weatherType(req.weatherType())
                .intensity(req.intensity())
                .tags(req.tags())
                .memo(req.memo())
                .recordedAt(recordedAt)
                .build();

        record = emotionRecordRepository.save(record);
        log.debug("감정 기록 저장: userId={}, weather={}, intensity={}",
                userId, req.weatherType(), req.intensity());

        // DEF 경험치 지급
        characterService.addExp(userId, EMOTION_EXP, StatType.DEF);

        // 이벤트 발행
        eventPublisher.publishEvent(
                new EmotionRecordedEvent(this, userId, req.weatherType(), req.intensity()));

        return EmotionResponse.from(record);
    }

    /**
     * 월간 감정 캘린더를 조회한다.
     * <p>날짜별 대표 날씨를 가중 평균으로 계산한다.</p>
     */
    public MonthlyCalendarResponse getMonthlyCalendar(Long userId, YearMonth yearMonth) {
        LocalDateTime from = yearMonth.atDay(1).atStartOfDay();
        LocalDateTime to = yearMonth.atEndOfMonth().atTime(LocalTime.MAX);

        List<EmotionRecord> records = emotionRecordRepository
                .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(userId, from, to);

        // 날짜별 그룹핑
        Map<LocalDate, List<EmotionRecord>> grouped = records.stream()
                .collect(Collectors.groupingBy(
                        r -> r.getRecordedAt().toLocalDate(),
                        TreeMap::new,
                        Collectors.toList()));

        List<DayEmotionSummary> days = grouped.entrySet().stream()
                .map(entry -> {
                    LocalDate date = entry.getKey();
                    List<EmotionRecord> dayRecords = entry.getValue();
                    WeatherType dominant = calculateDominantWeather(dayRecords);
                    List<EmotionResponse> responses = dayRecords.stream()
                            .map(EmotionResponse::from)
                            .toList();
                    return new DayEmotionSummary(date, dominant, dayRecords.size(), responses);
                })
                .toList();

        return new MonthlyCalendarResponse(yearMonth, days);
    }

    /**
     * 주간 감정 요약을 조회한다.
     * <p>이번 주(월~일) 날씨 분포 및 전주 비교 데이터를 반환한다.</p>
     */
    public WeeklySummaryResponse getWeeklySummary(Long userId) {
        LocalDate today = LocalDate.now();
        // 이번 주 월요일
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate weekEnd = weekStart.plusDays(6);

        LocalDateTime from = weekStart.atStartOfDay();
        LocalDateTime to = weekEnd.atTime(LocalTime.MAX);

        List<EmotionRecord> thisWeek = emotionRecordRepository
                .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(userId, from, to);

        // 전주 동일 기간
        LocalDate lastWeekStart = weekStart.minusWeeks(1);
        LocalDate lastWeekEnd = lastWeekStart.plusDays(6);

        List<EmotionRecord> lastWeek = emotionRecordRepository
                .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
                        userId,
                        lastWeekStart.atStartOfDay(),
                        lastWeekEnd.atTime(LocalTime.MAX));

        // 날씨 분포 집계
        Map<WeatherType, Integer> distribution = buildDistribution(thisWeek);
        Map<WeatherType, Integer> lastWeekDist = buildDistribution(lastWeek);

        // 전주 대비 변화량
        Map<WeatherType, Integer> compared = new EnumMap<>(WeatherType.class);
        for (WeatherType wt : WeatherType.values()) {
            int current = distribution.getOrDefault(wt, 0);
            int previous = lastWeekDist.getOrDefault(wt, 0);
            compared.put(wt, current - previous);
        }

        // 평균 날씨 수치
        double avgValue = thisWeek.isEmpty() ? 0.0 :
                thisWeek.stream()
                        .mapToInt(r -> r.getWeatherType().getNumericValue())
                        .average()
                        .orElse(0.0);

        return new WeeklySummaryResponse(
                weekStart, weekEnd, distribution, compared,
                thisWeek.size(), Math.round(avgValue * 100.0) / 100.0);
    }

    /**
     * 특정 날짜의 감정 기록 목록을 조회한다.
     */
    public List<EmotionResponse> getEmotionsByDate(Long userId, LocalDate date) {
        LocalDateTime from = date.atStartOfDay();
        LocalDateTime to = date.atTime(LocalTime.MAX);

        return emotionRecordRepository
                .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(userId, from, to)
                .stream()
                .map(EmotionResponse::from)
                .toList();
    }

    // ── private helpers ──

    /**
     * 대표 날씨를 가중 평균으로 계산한다.
     * <p>각 기록의 (weatherType.numericValue * intensity)의 가중 합 / 총 intensity</p>
     */
    private WeatherType calculateDominantWeather(List<EmotionRecord> records) {
        int totalIntensity = 0;
        double weightedSum = 0;

        for (EmotionRecord record : records) {
            int intensity = record.getIntensity();
            totalIntensity += intensity;
            weightedSum += record.getWeatherType().getNumericValue() * intensity;
        }

        if (totalIntensity == 0) {
            return WeatherType.CLOUDY;
        }

        double avg = weightedSum / totalIntensity;
        return WeatherType.fromNumericValue(avg);
    }

    /**
     * 날씨 분포를 집계한다.
     */
    private Map<WeatherType, Integer> buildDistribution(List<EmotionRecord> records) {
        Map<WeatherType, Integer> dist = new EnumMap<>(WeatherType.class);
        for (EmotionRecord record : records) {
            dist.merge(record.getWeatherType(), 1, Integer::sum);
        }
        return dist;
    }
}
