package com.brainquest.event.events;

import com.brainquest.battle.entity.BattleResult;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 전투 완료 이벤트.
 * <p>발행: BATTLE → 구독: QUEST(체크포인트 완료), CHARACTER(ATK 경험치), GATE(리포트 데이터)</p>
 */
@Getter
public class BattleCompletedEvent extends ApplicationEvent {

    private final Long userId;
    private final Long sessionId;
    private final BattleResult result;
    private final int expEarned;
    private final int goldEarned;
    private final Long checkpointId;
    private final Long questId;

    public BattleCompletedEvent(Object source, Long userId, Long sessionId,
                                BattleResult result, int expEarned, int goldEarned,
                                Long checkpointId, Long questId) {
        super(source);
        this.userId = userId;
        this.sessionId = sessionId;
        this.result = result;
        this.expEarned = expEarned;
        this.goldEarned = goldEarned;
        this.checkpointId = checkpointId;
        this.questId = questId;
    }
}
