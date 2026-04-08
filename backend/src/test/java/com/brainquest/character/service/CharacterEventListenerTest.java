package com.brainquest.character.service;

import com.brainquest.battle.entity.BattleResult;
import com.brainquest.character.entity.StatType;
import com.brainquest.event.events.*;
import com.brainquest.gate.entity.CheckinType;
import com.brainquest.gate.entity.StreakType;
import com.brainquest.sky.entity.WeatherType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;



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

    // ── BATTLE / QUEST / SKY 이벤트 ──

    @Nested
    @DisplayName("handleBattleCompleted")
    class HandleBattleCompleted {

        @Test
        @DisplayName("VICTORY — ATK 경험치 + 골드 지급")
        void victory_grantsExpAndGold() {
            var event = new BattleCompletedEvent(this, 1L, 10L,
                    BattleResult.VICTORY, 50, 25, null, null);

            listener.handleBattleCompleted(event);

            verify(characterService).addExp(1L, 50, StatType.ATK);
            verify(characterService).addGold(1L, 25);
        }

        @Test
        @DisplayName("DEFEAT — 경험치만 지급 (골드 0)")
        void defeat_grantsExpOnly() {
            var event = new BattleCompletedEvent(this, 1L, 10L,
                    BattleResult.DEFEAT, 15, 0, null, null);

            listener.handleBattleCompleted(event);

            verify(characterService).addExp(1L, 15, StatType.ATK);
            verify(characterService, never()).addGold(anyLong(), anyInt());
        }

        @Test
        @DisplayName("ABANDON — 경험치/골드 모두 0이면 미지급")
        void abandon_noReward() {
            var event = new BattleCompletedEvent(this, 1L, 10L,
                    BattleResult.ABANDON, 0, 0, null, null);

            listener.handleBattleCompleted(event);

            verify(characterService, never()).addExp(anyLong(), anyInt(), any());
            verify(characterService, never()).addGold(anyLong(), anyInt());
        }
    }

    @Nested
    @DisplayName("handleCheckpointCompleted")
    class HandleCheckpointCompleted {

        @Test
        @DisplayName("체크포인트 완료 → WIS 경험치 + 골드 지급")
        void grantsWisExpAndGold() {
            var event = new CheckpointCompletedEvent(this, 1L, 10L, 5L, 12, 7);

            listener.handleCheckpointCompleted(event);

            verify(characterService).addExp(1L, 12, StatType.WIS);
            verify(characterService).addGold(1L, 7);
        }

        @Test
        @DisplayName("골드 0이면 addGold 미호출")
        void zeroGold_skipsAddGold() {
            var event = new CheckpointCompletedEvent(this, 1L, 10L, 5L, 10, 0);

            listener.handleCheckpointCompleted(event);

            verify(characterService).addExp(1L, 10, StatType.WIS);
            verify(characterService, never()).addGold(anyLong(), anyInt());
        }
    }

    @Nested
    @DisplayName("handleQuestCompleted")
    class HandleQuestCompleted {

        @Test
        @DisplayName("잔여 보상 + 아이템 드롭 시도")
        void grantsRemainingAndDropsItem() {
            var event = new QuestCompletedEvent(this, 1L, 5L, "C", 5, 3);

            listener.handleQuestCompleted(event);

            verify(characterService).addExp(1L, 5, StatType.WIS);
            verify(characterService).addGold(1L, 3);
            verify(characterService).dropItem(1L, "C");
        }

        @Test
        @DisplayName("잔여 보상 0 → addExp/addGold 미호출, dropItem만")
        void noRemaining_onlyDropItem() {
            var event = new QuestCompletedEvent(this, 1L, 5L, "D", 0, 0);

            listener.handleQuestCompleted(event);

            verify(characterService, never()).addExp(anyLong(), anyInt(), any());
            verify(characterService, never()).addGold(anyLong(), anyInt());
            verify(characterService).dropItem(1L, "D");
        }
    }

    @Nested
    @DisplayName("handleEmotionRecorded")
    class HandleEmotionRecorded {

        @Test
        @DisplayName("감정 기록 → DEF 경험치 +5")
        void grantsDefExp() {
            var event = new EmotionRecordedEvent(this, 1L, WeatherType.SUNNY, 4);

            listener.handleEmotionRecorded(event);

            verify(characterService).addExp(1L, 5, StatType.DEF);
        }
    }
}
