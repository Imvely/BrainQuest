package com.brainquest.gate.service;

import com.brainquest.common.exception.DuplicateResourceException;
import com.brainquest.event.events.CheckinCompletedEvent;
import com.brainquest.event.events.MorningCheckinEvent;
import com.brainquest.event.events.StreakUpdatedEvent;
import com.brainquest.gate.dto.CheckinRequest;
import com.brainquest.gate.dto.CheckinResponse;
import com.brainquest.gate.dto.StreakResponse;
import com.brainquest.gate.entity.CheckinType;
import com.brainquest.gate.entity.DailyCheckin;
import com.brainquest.gate.entity.Streak;
import com.brainquest.gate.entity.StreakType;
import com.brainquest.gate.repository.DailyCheckinRepository;
import com.brainquest.gate.repository.StreakRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 아침/저녁 체크인 서비스.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CheckinService {

    private static final int CHECKIN_EXP = 10;
    private static final Map<Integer, Integer> STREAK_BONUS_MAP = Map.of(
            7, 50,
            14, 100,
            30, 200,
            60, 500,
            100, 1000
    );
    private static final Set<Integer> STREAK_BONUS_DAYS = STREAK_BONUS_MAP.keySet();

    private final DailyCheckinRepository dailyCheckinRepository;
    private final StreakRepository streakRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 아침 체크인을 제출한다.
     */
    @Transactional
    public CheckinResponse submitMorningCheckin(Long userId, CheckinRequest request) {
        LocalDate today = LocalDate.now();
        checkDuplicate(userId, today, CheckinType.MORNING);

        validateScoreRange("sleepQuality", request.sleepQuality(), 1, 3);
        validateScoreRange("condition", request.condition(), 1, 5);

        DailyCheckin checkin = DailyCheckin.builder()
                .userId(userId)
                .checkinType(CheckinType.MORNING)
                .checkinDate(today)
                .sleepHours(request.sleepHours())
                .sleepQuality(request.sleepQuality())
                .condition(request.condition())
                .memo(request.memo())
                .build();

        checkin = dailyCheckinRepository.save(checkin);

        int streakCount = updateStreak(userId, StreakType.CHECKIN);

        eventPublisher.publishEvent(
                new CheckinCompletedEvent(this, userId, CheckinType.MORNING, CHECKIN_EXP));
        eventPublisher.publishEvent(
                new MorningCheckinEvent(this, userId, request.sleepHours(), request.condition()));

        return CheckinResponse.of(checkin, streakCount, CHECKIN_EXP);
    }

    /**
     * 저녁 체크인을 제출한다.
     */
    @Transactional
    public CheckinResponse submitEveningCheckin(Long userId, CheckinRequest request) {
        LocalDate today = LocalDate.now();
        checkDuplicate(userId, today, CheckinType.EVENING);

        validateScoreRange("focusScore", request.focusScore(), 1, 5);
        validateScoreRange("impulsivityScore", request.impulsivityScore(), 1, 5);
        validateScoreRange("emotionScore", request.emotionScore(), 1, 5);

        DailyCheckin checkin = DailyCheckin.builder()
                .userId(userId)
                .checkinType(CheckinType.EVENING)
                .checkinDate(today)
                .focusScore(request.focusScore())
                .impulsivityScore(request.impulsivityScore())
                .emotionScore(request.emotionScore())
                .memo(request.memo())
                .build();

        checkin = dailyCheckinRepository.save(checkin);

        int streakCount = updateStreak(userId, StreakType.CHECKIN);

        eventPublisher.publishEvent(
                new CheckinCompletedEvent(this, userId, CheckinType.EVENING, CHECKIN_EXP));

        return CheckinResponse.of(checkin, streakCount, CHECKIN_EXP);
    }

    /**
     * 사용자의 전체 스트릭을 조회한다.
     */
    public List<StreakResponse> getStreaks(Long userId) {
        return streakRepository.findAllByUserId(userId).stream()
                .map(StreakResponse::from)
                .toList();
    }

    /**
     * 체크인 기록을 기간별로 조회한다.
     */
    public List<CheckinResponse> getCheckinHistory(Long userId, LocalDate from, LocalDate to) {
        return dailyCheckinRepository
                .findByUserIdAndCheckinDateBetweenOrderByCheckinDateDesc(userId, from, to)
                .stream()
                .map(c -> CheckinResponse.of(c, 0, 0))
                .toList();
    }

    /**
     * 스트릭을 갱신하고, 보너스 경험치를 지급한다.
     *
     * @return 갱신 후 현재 연속 일수
     */
    int updateStreak(Long userId, StreakType type) {
        Streak streak = streakRepository.findByUserIdAndStreakType(userId, type)
                .orElseGet(() -> streakRepository.save(Streak.builder()
                        .userId(userId)
                        .streakType(type)
                        .build()));

        LocalDate today = LocalDate.now();
        int count = streak.recordToday(today);
        streakRepository.save(streak);

        boolean isBonus = STREAK_BONUS_DAYS.contains(count);

        eventPublisher.publishEvent(
                new StreakUpdatedEvent(this, userId, type, count, isBonus));

        return count;
    }

    private void checkDuplicate(Long userId, LocalDate date, CheckinType type) {
        if (dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(userId, date, type)) {
            throw new DuplicateResourceException("GATE_001",
                    "이미 오늘 " + type.name() + " 체크인 기록이 있습니다.");
        }
    }

    private void validateScoreRange(String fieldName, Integer value, int min, int max) {
        if (value == null) {
            throw new IllegalArgumentException(fieldName + "은(는) 필수입니다.");
        }
        if (value < min || value > max) {
            throw new IllegalArgumentException(
                    fieldName + "은(는) " + min + "~" + max + " 범위여야 합니다.");
        }
    }
}
