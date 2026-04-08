package com.brainquest.event.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 체크포인트 완료 이벤트.
 * <p>발행: QUEST → 구독: CHARACTER(WIS 경험치)</p>
 */
@Getter
public class CheckpointCompletedEvent extends ApplicationEvent {

    private final Long userId;
    private final Long checkpointId;
    private final Long questId;
    private final int expReward;

    public CheckpointCompletedEvent(Object source, Long userId, Long checkpointId,
                                    Long questId, int expReward) {
        super(source);
        this.userId = userId;
        this.checkpointId = checkpointId;
        this.questId = questId;
        this.expReward = expReward;
    }
}
