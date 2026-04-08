package com.brainquest.gate.service;

import com.brainquest.common.exception.DuplicateResourceException;
import com.brainquest.event.events.CheckinCompletedEvent;
import com.brainquest.event.events.StreakUpdatedEvent;
import com.brainquest.gate.dto.CheckinRequest;
import com.brainquest.gate.dto.CheckinResponse;
import com.brainquest.gate.entity.*;
import com.brainquest.gate.repository.DailyCheckinRepository;
import com.brainquest.gate.repository.StreakRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CheckinService 단위 테스트")
class CheckinServiceTest {

    @InjectMocks
    private CheckinService checkinService;

    @Mock
    private DailyCheckinRepository dailyCheckinRepository;

    @Mock
    private StreakRepository streakRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    // --- submitMorningCheckin ---

    @Nested
    @DisplayName("submitMorningCheckin")
    class SubmitMorningCheckin {

        @Test
        @DisplayName("정상 — 체크인 저장 + 스트릭 갱신 + 경험치 지급")
        void success() {
            // given
            Long userId = 1L;
            CheckinRequest request = new CheckinRequest(
                    CheckinType.MORNING, BigDecimal.valueOf(7.5), 2, 4,
                    null, null, null, "잘 잤다");
            LocalDate today = LocalDate.now();

            given(dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(
                    userId, today, CheckinType.MORNING)).willReturn(false);
            given(dailyCheckinRepository.save(any(DailyCheckin.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            Streak streak = Streak.builder().userId(userId).streakType(StreakType.CHECKIN).build();
            given(streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN))
                    .willReturn(Optional.of(streak));

            // when
            CheckinResponse response = checkinService.submitMorningCheckin(userId, request);

            // then
            assertThat(response.type()).isEqualTo(CheckinType.MORNING);
            assertThat(response.sleepHours()).isEqualTo(BigDecimal.valueOf(7.5));
            assertThat(response.condition()).isEqualTo(4);
            assertThat(response.expReward()).isEqualTo(10);
            assertThat(response.streakCount()).isEqualTo(1);

            verify(streakRepository).save(any(Streak.class));
            // CheckinCompletedEvent + MorningCheckinEvent + StreakUpdatedEvent = 3회
            verify(eventPublisher, times(3)).publishEvent(any());
            verify(eventPublisher).publishEvent(any(CheckinCompletedEvent.class));
        }

        @Test
        @DisplayName("sleepQuality 범위 초과 — IllegalArgumentException")
        void invalidSleepQuality_throwsException() {
            // given
            Long userId = 1L;
            CheckinRequest request = new CheckinRequest(
                    CheckinType.MORNING, BigDecimal.valueOf(7), 5, 3,
                    null, null, null, null);  // sleepQuality=5 → 1-3 범위 초과

            given(dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(
                    userId, LocalDate.now(), CheckinType.MORNING)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> checkinService.submitMorningCheckin(userId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("sleepQuality");
        }

        @Test
        @DisplayName("중복 — DuplicateResourceException")
        void duplicate_throwsException() {
            // given
            Long userId = 1L;
            CheckinRequest request = new CheckinRequest(
                    CheckinType.MORNING, BigDecimal.valueOf(7), 2, 3,
                    null, null, null, null);
            LocalDate today = LocalDate.now();

            given(dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(
                    userId, today, CheckinType.MORNING)).willReturn(true);

            // when & then
            assertThatThrownBy(() -> checkinService.submitMorningCheckin(userId, request))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("MORNING");

            verify(dailyCheckinRepository, never()).save(any());
        }
    }

    // --- submitEveningCheckin ---

    @Nested
    @DisplayName("submitEveningCheckin")
    class SubmitEveningCheckin {

        @Test
        @DisplayName("정상 — 저녁 체크인 저장")
        void success() {
            // given
            Long userId = 1L;
            CheckinRequest request = new CheckinRequest(
                    CheckinType.EVENING, null, null, null,
                    4, 3, 5, "오늘 집중 잘 됐다");
            LocalDate today = LocalDate.now();

            given(dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(
                    userId, today, CheckinType.EVENING)).willReturn(false);
            given(dailyCheckinRepository.save(any(DailyCheckin.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            Streak streak = Streak.builder().userId(userId).streakType(StreakType.CHECKIN).build();
            given(streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN))
                    .willReturn(Optional.of(streak));

            // when
            CheckinResponse response = checkinService.submitEveningCheckin(userId, request);

            // then
            assertThat(response.type()).isEqualTo(CheckinType.EVENING);
            assertThat(response.focusScore()).isEqualTo(4);
            assertThat(response.impulsivityScore()).isEqualTo(3);
            assertThat(response.emotionScore()).isEqualTo(5);
        }

        @Test
        @DisplayName("점수 범위 초과 — IllegalArgumentException")
        void invalidScore_throwsException() {
            // given
            Long userId = 1L;
            CheckinRequest request = new CheckinRequest(
                    CheckinType.EVENING, null, null, null,
                    6, 3, 5, null);  // focusScore=6 → 범위 초과
            LocalDate today = LocalDate.now();

            given(dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(
                    userId, today, CheckinType.EVENING)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> checkinService.submitEveningCheckin(userId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("focusScore");
        }

        @Test
        @DisplayName("필수 점수 null — IllegalArgumentException")
        void nullScore_throwsException() {
            // given
            Long userId = 1L;
            CheckinRequest request = new CheckinRequest(
                    CheckinType.EVENING, null, null, null,
                    null, 3, 5, null);  // focusScore=null
            LocalDate today = LocalDate.now();

            given(dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(
                    userId, today, CheckinType.EVENING)).willReturn(false);

            // when & then
            assertThatThrownBy(() -> checkinService.submitEveningCheckin(userId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("focusScore");
        }
    }

    // --- updateStreak ---

    @Nested
    @DisplayName("updateStreak")
    class UpdateStreak {

        @Test
        @DisplayName("연속 체크인 — currentCount 증가")
        void consecutive_incrementsCount() {
            // given
            Long userId = 1L;
            Streak streak = Streak.builder().userId(userId).streakType(StreakType.CHECKIN).build();
            // 어제 기록이 있는 상태를 시뮬레이션
            streak.recordToday(LocalDate.now().minusDays(1));

            given(streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN))
                    .willReturn(Optional.of(streak));

            // when
            int count = checkinService.updateStreak(userId, StreakType.CHECKIN);

            // then
            assertThat(count).isEqualTo(2);
            assertThat(streak.getMaxCount()).isEqualTo(2);
        }

        @Test
        @DisplayName("하루 이상 공백 — currentCount 리셋")
        void gap_resetsCount() {
            // given
            Long userId = 1L;
            Streak streak = Streak.builder().userId(userId).streakType(StreakType.CHECKIN).build();
            // 3일 전 기록
            streak.recordToday(LocalDate.now().minusDays(3));

            given(streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN))
                    .willReturn(Optional.of(streak));

            // when
            int count = checkinService.updateStreak(userId, StreakType.CHECKIN);

            // then
            assertThat(count).isEqualTo(1); // 리셋
        }

        @Test
        @DisplayName("같은 날 중복 호출 — currentCount 유지")
        void sameDay_noChange() {
            // given
            Long userId = 1L;
            Streak streak = Streak.builder().userId(userId).streakType(StreakType.CHECKIN).build();
            streak.recordToday(LocalDate.now()); // 이미 오늘 기록

            given(streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN))
                    .willReturn(Optional.of(streak));

            // when
            int count = checkinService.updateStreak(userId, StreakType.CHECKIN);

            // then
            assertThat(count).isEqualTo(1); // 변경 없음
        }

        @Test
        @DisplayName("7일 연속 — 50 보너스 경험치 지급")
        void sevenDays_grantsBonus() {
            // given
            Long userId = 1L;
            Streak streak = Streak.builder().userId(userId).streakType(StreakType.CHECKIN).build();
            // 6일 연속 기록 후 어제까지 유지 → 오늘이 7일째
            LocalDate start = LocalDate.now().minusDays(6);
            for (int i = 0; i < 6; i++) {
                streak.recordToday(start.plusDays(i));
            }

            given(streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN))
                    .willReturn(Optional.of(streak));

            // when
            int count = checkinService.updateStreak(userId, StreakType.CHECKIN);

            // then
            assertThat(count).isEqualTo(7);

            ArgumentCaptor<StreakUpdatedEvent> captor = ArgumentCaptor.forClass(StreakUpdatedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());
            assertThat(captor.getValue().isBonus()).isTrue();
            assertThat(captor.getValue().getCurrentCount()).isEqualTo(7);
        }

        @Test
        @DisplayName("스트릭 없음 — 신규 생성 후 count=1")
        void noStreak_createsNew() {
            // given
            Long userId = 1L;
            Streak newStreak = Streak.builder().userId(userId).streakType(StreakType.CHECKIN).build();

            given(streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN))
                    .willReturn(Optional.empty());
            given(streakRepository.save(any(Streak.class))).willReturn(newStreak);

            // when
            int count = checkinService.updateStreak(userId, StreakType.CHECKIN);

            // then
            assertThat(count).isEqualTo(1);
            // orElseGet에서 1번 + recordToday 후 명시적 save 1번 = 총 2번
            verify(streakRepository, times(2)).save(any(Streak.class));
        }
    }

    // --- submitEveningCheckin 추가 ---

    @Nested
    @DisplayName("submitEveningCheckin 추가 케이스")
    class SubmitEveningCheckinExtra {

        @Test
        @DisplayName("중복 — DuplicateResourceException")
        void duplicate_throwsException() {
            // given
            Long userId = 1L;
            CheckinRequest request = new CheckinRequest(
                    CheckinType.EVENING, null, null, null,
                    4, 3, 5, null);

            given(dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(
                    userId, LocalDate.now(), CheckinType.EVENING)).willReturn(true);

            // when & then
            assertThatThrownBy(() -> checkinService.submitEveningCheckin(userId, request))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("EVENING");

            verify(dailyCheckinRepository, never()).save(any());
        }

        @Test
        @DisplayName("impulsivityScore 범위 초과 — IllegalArgumentException")
        void invalidImpulsivity_throwsException() {
            Long userId = 1L;
            CheckinRequest request = new CheckinRequest(
                    CheckinType.EVENING, null, null, null,
                    3, 0, 5, null);  // impulsivityScore=0 → 1-5 범위 미달

            given(dailyCheckinRepository.existsByUserIdAndCheckinDateAndCheckinType(
                    userId, LocalDate.now(), CheckinType.EVENING)).willReturn(false);

            assertThatThrownBy(() -> checkinService.submitEveningCheckin(userId, request))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("impulsivityScore");
        }
    }

    // --- getCheckinHistory ---

    @Nested
    @DisplayName("getCheckinHistory")
    class GetCheckinHistory {

        @Test
        @DisplayName("정상 — 기간 내 체크인 기록 반환")
        void success() {
            // given
            Long userId = 1L;
            LocalDate from = LocalDate.of(2026, 4, 1);
            LocalDate to = LocalDate.of(2026, 4, 7);

            DailyCheckin c1 = DailyCheckin.builder()
                    .userId(userId).checkinType(CheckinType.MORNING)
                    .checkinDate(LocalDate.of(2026, 4, 5))
                    .sleepHours(BigDecimal.valueOf(7)).sleepQuality(2).condition(4)
                    .build();
            DailyCheckin c2 = DailyCheckin.builder()
                    .userId(userId).checkinType(CheckinType.EVENING)
                    .checkinDate(LocalDate.of(2026, 4, 5))
                    .focusScore(4).impulsivityScore(3).emotionScore(5)
                    .build();

            given(dailyCheckinRepository
                    .findByUserIdAndCheckinDateBetweenOrderByCheckinDateDesc(userId, from, to))
                    .willReturn(List.of(c1, c2));

            // when
            var history = checkinService.getCheckinHistory(userId, from, to);

            // then
            assertThat(history).hasSize(2);
            assertThat(history.get(0).type()).isEqualTo(CheckinType.MORNING);
            assertThat(history.get(1).type()).isEqualTo(CheckinType.EVENING);
        }

        @Test
        @DisplayName("기록 없음 — 빈 목록")
        void empty() {
            Long userId = 1L;
            LocalDate from = LocalDate.of(2026, 3, 1);
            LocalDate to = LocalDate.of(2026, 3, 31);

            given(dailyCheckinRepository
                    .findByUserIdAndCheckinDateBetweenOrderByCheckinDateDesc(userId, from, to))
                    .willReturn(List.of());

            var history = checkinService.getCheckinHistory(userId, from, to);

            assertThat(history).isEmpty();
        }
    }

    // --- getStreaks ---

    @Nested
    @DisplayName("getStreaks")
    class GetStreaks {

        @Test
        @DisplayName("정상 — 전체 스트릭 목록 반환")
        void success() {
            Long userId = 1L;
            Streak s1 = Streak.builder().userId(userId).streakType(StreakType.CHECKIN).build();
            s1.recordToday(LocalDate.now());
            Streak s2 = Streak.builder().userId(userId).streakType(StreakType.BATTLE).build();
            s2.recordToday(LocalDate.now());

            given(streakRepository.findAllByUserId(userId)).willReturn(List.of(s1, s2));

            var streaks = checkinService.getStreaks(userId);

            assertThat(streaks).hasSize(2);
            assertThat(streaks.get(0).streakType()).isEqualTo(StreakType.CHECKIN);
            assertThat(streaks.get(1).streakType()).isEqualTo(StreakType.BATTLE);
        }

        @Test
        @DisplayName("스트릭 없음 — 빈 목록")
        void empty() {
            given(streakRepository.findAllByUserId(1L)).willReturn(List.of());

            var streaks = checkinService.getStreaks(1L);

            assertThat(streaks).isEmpty();
        }
    }
}
