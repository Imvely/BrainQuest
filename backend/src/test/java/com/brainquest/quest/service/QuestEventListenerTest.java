package com.brainquest.quest.service;

import com.brainquest.battle.entity.BattleResult;
import com.brainquest.event.events.BattleCompletedEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("QuestEventListener 단위 테스트")
class QuestEventListenerTest {

    @InjectMocks
    private QuestEventListener listener;

    @Mock
    private QuestService questService;

    @Test
    @DisplayName("VICTORY + checkpointId 있음 → 체크포인트 자동 완료")
    void victory_withCheckpoint_completesCheckpoint() {
        var event = new BattleCompletedEvent(this, 1L, 10L,
                BattleResult.VICTORY, 50, 25, 20L, 5L);

        listener.handleBattleCompleted(event);

        verify(questService).completeCheckpoint(1L, 5L, 20L);
    }

    @Test
    @DisplayName("VICTORY + checkpointId null → 무시")
    void victory_noCheckpoint_skipped() {
        var event = new BattleCompletedEvent(this, 1L, 10L,
                BattleResult.VICTORY, 50, 25, null, null);

        listener.handleBattleCompleted(event);

        verify(questService, never()).completeCheckpoint(anyLong(), anyLong(), anyLong());
    }

    @Test
    @DisplayName("DEFEAT → 무시")
    void defeat_skipped() {
        var event = new BattleCompletedEvent(this, 1L, 10L,
                BattleResult.DEFEAT, 15, 0, 20L, 5L);

        listener.handleBattleCompleted(event);

        verify(questService, never()).completeCheckpoint(anyLong(), anyLong(), anyLong());
    }

    @Test
    @DisplayName("ABANDON → 무시")
    void abandon_skipped() {
        var event = new BattleCompletedEvent(this, 1L, 10L,
                BattleResult.ABANDON, 0, 0, 20L, 5L);

        listener.handleBattleCompleted(event);

        verify(questService, never()).completeCheckpoint(anyLong(), anyLong(), anyLong());
    }

    @Test
    @DisplayName("completeCheckpoint 예외 발생 시 삼키고 로그")
    void exception_caughtAndLogged() {
        var event = new BattleCompletedEvent(this, 1L, 10L,
                BattleResult.VICTORY, 50, 25, 20L, 5L);

        doThrow(new RuntimeException("테스트 예외"))
                .when(questService).completeCheckpoint(1L, 5L, 20L);

        // 예외가 전파되지 않음
        listener.handleBattleCompleted(event);

        verify(questService).completeCheckpoint(1L, 5L, 20L);
    }
}
