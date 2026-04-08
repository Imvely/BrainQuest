package com.brainquest.event.events;

import com.brainquest.gate.entity.CheckinType;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 체크인 완료 이벤트.
 * <p>발행: GATE → 구독: CHARACTER(HP 경험치 지급)</p>
 */
@Getter
public class CheckinCompletedEvent extends ApplicationEvent {

    private final Long userId;
    private final CheckinType checkinType;
    private final int expReward;

    public CheckinCompletedEvent(Object source, Long userId, CheckinType checkinType, int expReward) {
        super(source);
        this.userId = userId;
        this.checkinType = checkinType;
        this.expReward = expReward;
    }
}
