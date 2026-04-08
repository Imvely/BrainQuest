package com.brainquest.event;

import com.brainquest.battle.entity.BattleResult;
import com.brainquest.character.entity.StatType;
import com.brainquest.character.service.CharacterEventListener;
import com.brainquest.character.service.CharacterService;
import com.brainquest.event.events.*;
import com.brainquest.notification.NotificationEventListener;
import com.brainquest.quest.service.QuestEventListener;
import com.brainquest.quest.service.QuestService;
import com.brainquest.sky.entity.WeatherType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * 이벤트 버스 통합 플로우 테스트.
 *
 * <p>각 리스너의 핸들러를 수동으로 호출하여 이벤트 체인의 비즈니스 로직을 검증한다.</p>
 *
 * <p>검증 시나리오:<br>
 * 전투 완료(VICTORY) → 캐릭터 경험치/골드 → 체크포인트 자동 완료
 * → 퀘스트 완료 → 잔여 보상 + 아이템 드롭 → 레벨업 알림</p>
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("이벤트 버스 통합 플로우 테스트")
class EventBusIntegrationTest {

    @Mock
    private CharacterService characterService;

    @Mock
    private QuestService questService;

    @Test
    @DisplayName("전투 VICTORY → 경험치/골드 → 체크포인트 자동 완료 → 퀘스트 완료 → 보상 체인")
    void fullEventChain_battleToQuestCompletion() {
        // 리스너 생성
        CharacterEventListener characterListener = new CharacterEventListener(characterService);
        QuestEventListener questListener = new QuestEventListener(questService);
        NotificationEventListener notificationListener = new NotificationEventListener();

        // ── Step 1: 전투 완료 이벤트 ──
        BattleCompletedEvent battleEvent = new BattleCompletedEvent(
                this, 1L, 10L, BattleResult.VICTORY,
                50, 25, 20L, 5L);

        // CharacterEventListener: 동기 → ATK 경험치 + 골드
        characterListener.handleBattleCompleted(battleEvent);

        verify(characterService).addExp(1L, 50, StatType.ATK);
        verify(characterService).addGold(1L, 25);

        // QuestEventListener: AFTER_COMMIT → 체크포인트 자동 완료
        questListener.handleBattleCompleted(battleEvent);

        verify(questService).completeCheckpoint(1L, 5L, 20L);

        // ── Step 2: 체크포인트 완료 이벤트 (QuestService가 발행) ──
        CheckpointCompletedEvent cpEvent = new CheckpointCompletedEvent(
                this, 1L, 20L, 5L, 12, 7);

        characterListener.handleCheckpointCompleted(cpEvent);

        verify(characterService).addExp(1L, 12, StatType.WIS);
        verify(characterService).addGold(1L, 7);

        // ── Step 3: 퀘스트 완료 이벤트 (잔여 보상 + 아이템 드롭) ──
        QuestCompletedEvent questEvent = new QuestCompletedEvent(
                this, 1L, 5L, "C", 1, 1);

        characterListener.handleQuestCompleted(questEvent);

        verify(characterService).addExp(1L, 1, StatType.WIS);
        verify(characterService).addGold(1L, 1);
        verify(characterService).dropItem(1L, "C");

        // ── Step 4: 레벨업 이벤트 ──
        LevelUpEvent levelUpEvent = new LevelUpEvent(
                this, 1L, 5, java.util.Map.of("gold", 50));

        // 예외 없이 처리
        notificationListener.handleLevelUp(levelUpEvent);
    }

    @Test
    @DisplayName("전투 DEFEAT → 경험치만 지급, 체크포인트 자동 완료 없음")
    void defeatBattle_noCheckpointCompletion() {
        CharacterEventListener characterListener = new CharacterEventListener(characterService);
        QuestEventListener questListener = new QuestEventListener(questService);

        BattleCompletedEvent defeatEvent = new BattleCompletedEvent(
                this, 1L, 10L, BattleResult.DEFEAT,
                15, 0, 20L, 5L);

        characterListener.handleBattleCompleted(defeatEvent);

        verify(characterService).addExp(1L, 15, StatType.ATK);
        verify(characterService, never()).addGold(anyLong(), anyInt());

        // DEFEAT → 체크포인트 자동 완료 안 함
        questListener.handleBattleCompleted(defeatEvent);

        verify(questService, never()).completeCheckpoint(anyLong(), anyLong(), anyLong());
    }

    @Test
    @DisplayName("감정 기록 → DEF 경험치 +5")
    void emotionRecord_grantsDefExp() {
        CharacterEventListener characterListener = new CharacterEventListener(characterService);

        EmotionRecordedEvent emotionEvent = new EmotionRecordedEvent(
                this, 1L, WeatherType.SUNNY, 4);

        characterListener.handleEmotionRecorded(emotionEvent);

        verify(characterService).addExp(1L, 5, StatType.DEF);
    }

    @Test
    @DisplayName("이벤트 리스너 예외 시 전파되지 않고 로그만 남김")
    void listenerException_doesNotPropagate() {
        CharacterEventListener characterListener = new CharacterEventListener(characterService);

        doThrow(new RuntimeException("DB 오류"))
                .when(characterService).addExp(anyLong(), anyInt(), any());

        BattleCompletedEvent event = new BattleCompletedEvent(
                this, 1L, 10L, BattleResult.VICTORY, 50, 25, null, null);

        // 예외가 삼켜져서 전파되지 않음
        characterListener.handleBattleCompleted(event);

        verify(characterService).addExp(1L, 50, StatType.ATK);
        // addGold는 호출되지 않음 (addExp에서 예외 발생 후 catch됨)
    }
}
