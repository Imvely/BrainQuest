package com.brainquest.event.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 스크리닝 완료 이벤트.
 * <p>발행: GATE → 구독: CHARACTER(HP 경험치 지급)</p>
 */
@Getter
public class ScreeningCompletedEvent extends ApplicationEvent {

    private final Long userId;
    private final int expReward;

    public ScreeningCompletedEvent(Object source, Long userId, int expReward) {
        super(source);
        this.userId = userId;
        this.expReward = expReward;
    }
}
