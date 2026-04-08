package com.brainquest.quest.service;

import com.brainquest.battle.entity.BattleResult;
import com.brainquest.event.events.BattleCompletedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * QUEST 모듈 이벤트 리스너.
 *
 * <p>전투 완료(VICTORY) 시 연결된 체크포인트를 자동 완료 처리한다.</p>
 *
 * <p><b>트랜잭션 정책:</b> {@code AFTER_COMMIT} — 전투 데이터가 커밋된 후에
 * 체크포인트 완료를 별도 트랜잭션으로 처리한다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class QuestEventListener {

    private final QuestService questService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleBattleCompleted(BattleCompletedEvent event) {
        if (event.getCheckpointId() == null || event.getResult() != BattleResult.VICTORY) {
            return;
        }

        try {
            log.info("전투 완료 → 체크포인트 자동 완료: userId={}, questId={}, checkpointId={}",
                    event.getUserId(), event.getQuestId(), event.getCheckpointId());
            questService.completeCheckpoint(
                    event.getUserId(), event.getQuestId(), event.getCheckpointId());
        } catch (Exception e) {
            log.error("체크포인트 자동 완료 실패: userId={}, checkpointId={}, {}",
                    event.getUserId(), event.getCheckpointId(), e.getMessage(), e);
        }
    }
}
