package com.brainquest.event.events;

import com.brainquest.battle.entity.BattleResult;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 전투 완료 이벤트.
 *
 * <p>발행: BATTLE</p>
 * <p>구독: MAP(타임블록 연동), GATE(리포트 데이터 집계)</p>
 *
 * <p><b>중복 지급 주의:</b> 경험치/골드는 {@code BattleService}가
 * {@code CharacterService}를 직접 호출하여 지급한다.
 * 이 이벤트를 구독하는 리스너에서 경험치를 추가 지급하면 중복 발생.</p>
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
