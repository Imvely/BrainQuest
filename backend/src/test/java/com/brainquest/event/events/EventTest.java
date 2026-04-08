package com.brainquest.event.events;

import com.brainquest.gate.entity.StreakType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ApplicationEvent 단위 테스트")
class EventTest {

    @Nested
    @DisplayName("MorningCheckinEvent")
    class MorningCheckinEventTest {

        @Test
        @DisplayName("생성 시 필드가 올바르게 설정된다")
        void fieldsSetCorrectly() {
            MorningCheckinEvent event = new MorningCheckinEvent(
                    this, 1L, BigDecimal.valueOf(7.5), 4);

            assertThat(event.getUserId()).isEqualTo(1L);
            assertThat(event.getSleepHours()).isEqualTo(BigDecimal.valueOf(7.5));
            assertThat(event.getCondition()).isEqualTo(4);
            assertThat(event.getSource()).isEqualTo(this);
        }

        @Test
        @DisplayName("null 필드 허용 (수면 시간 미입력 등)")
        void nullFieldsAllowed() {
            MorningCheckinEvent event = new MorningCheckinEvent(
                    this, 1L, null, null);

            assertThat(event.getSleepHours()).isNull();
            assertThat(event.getCondition()).isNull();
        }
    }

    @Nested
    @DisplayName("StreakUpdatedEvent")
    class StreakUpdatedEventTest {

        @Test
        @DisplayName("보너스 미달성 이벤트")
        void nonBonusEvent() {
            StreakUpdatedEvent event = new StreakUpdatedEvent(
                    this, 1L, StreakType.CHECKIN, 3, false);

            assertThat(event.getUserId()).isEqualTo(1L);
            assertThat(event.getStreakType()).isEqualTo(StreakType.CHECKIN);
            assertThat(event.getCurrentCount()).isEqualTo(3);
            assertThat(event.isBonus()).isFalse();
        }

        @Test
        @DisplayName("보너스 달성 이벤트")
        void bonusEvent() {
            StreakUpdatedEvent event = new StreakUpdatedEvent(
                    this, 1L, StreakType.CHECKIN, 7, true);

            assertThat(event.isBonus()).isTrue();
            assertThat(event.getCurrentCount()).isEqualTo(7);
        }

        @Test
        @DisplayName("모든 StreakType에 대해 생성 가능")
        void allStreakTypes() {
            for (StreakType type : StreakType.values()) {
                StreakUpdatedEvent event = new StreakUpdatedEvent(
                        this, 1L, type, 1, false);
                assertThat(event.getStreakType()).isEqualTo(type);
            }
        }
    }
}
