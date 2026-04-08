package com.brainquest.character.service;

import com.brainquest.character.entity.StatType;
import com.brainquest.event.events.CheckinCompletedEvent;
import com.brainquest.event.events.MedLogCompletedEvent;
import com.brainquest.event.events.ScreeningCompletedEvent;
import com.brainquest.event.events.StreakUpdatedEvent;
import com.brainquest.gate.entity.CheckinType;
import com.brainquest.gate.entity.StreakType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("CharacterEventListener 단위 테스트")
class CharacterEventListenerTest {

    @InjectMocks
    private CharacterEventListener listener;

    @Mock
    private CharacterService characterService;

    @Nested
    @DisplayName("handleCheckinCompleted")
    class HandleCheckinCompleted {

        @Test
        @DisplayName("체크인 완료 → HP 경험치 지급")
        void grantsHpExp() {
            var event = new CheckinCompletedEvent(this, 1L, CheckinType.MORNING, 10);

            listener.handleCheckinCompleted(event);

            verify(characterService).addExp(1L, 10, StatType.HP);
        }
    }

    @Nested
    @DisplayName("handleScreeningCompleted")
    class HandleScreeningCompleted {

        @Test
        @DisplayName("스크리닝 완료 → HP 경험치 지급")
        void grantsHpExp() {
            var event = new ScreeningCompletedEvent(this, 1L, 30);

            listener.handleScreeningCompleted(event);

            verify(characterService).addExp(1L, 30, StatType.HP);
        }
    }

    @Nested
    @DisplayName("handleMedLogCompleted")
    class HandleMedLogCompleted {

        @Test
        @DisplayName("약물 복용 기록 → HP 경험치 지급")
        void grantsHpExp() {
            var event = new MedLogCompletedEvent(this, 1L, 5);

            listener.handleMedLogCompleted(event);

            verify(characterService).addExp(1L, 5, StatType.HP);
        }
    }

    @Nested
    @DisplayName("handleStreakUpdated")
    class HandleStreakUpdated {

        @Test
        @DisplayName("7일 보너스 → 50 경험치 지급")
        void sevenDayBonus() {
            var event = new StreakUpdatedEvent(this, 1L, StreakType.CHECKIN, 7, true);

            listener.handleStreakUpdated(event);

            verify(characterService).addExp(1L, 50, StatType.HP);
        }

        @Test
        @DisplayName("14일 보너스 → 100 경험치 지급")
        void fourteenDayBonus() {
            var event = new StreakUpdatedEvent(this, 1L, StreakType.CHECKIN, 14, true);

            listener.handleStreakUpdated(event);

            verify(characterService).addExp(1L, 100, StatType.HP);
        }

        @Test
        @DisplayName("30일 보너스 → 200 경험치 지급")
        void thirtyDayBonus() {
            var event = new StreakUpdatedEvent(this, 1L, StreakType.CHECKIN, 30, true);

            listener.handleStreakUpdated(event);

            verify(characterService).addExp(1L, 200, StatType.HP);
        }

        @Test
        @DisplayName("보너스 아닌 일반 갱신 → 경험치 미지급")
        void nonBonusUpdate_noExp() {
            var event = new StreakUpdatedEvent(this, 1L, StreakType.CHECKIN, 3, false);

            listener.handleStreakUpdated(event);

            verify(characterService, never()).addExp(any(), anyInt(), any());
        }

        @Test
        @DisplayName("보너스 플래그 true지만 매핑에 없는 일수 → 경험치 미지급")
        void unmappedBonusDay_noExp() {
            var event = new StreakUpdatedEvent(this, 1L, StreakType.CHECKIN, 8, true);

            listener.handleStreakUpdated(event);

            verify(characterService, never()).addExp(any(), anyInt(), any());
        }
    }
}
