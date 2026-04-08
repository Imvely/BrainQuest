package com.brainquest.event.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;

/**
 * 아침 체크인 완료 이벤트.
 * <p>발행: GATE → 구독: MAP, CHARACTER</p>
 */
@Getter
public class MorningCheckinEvent extends ApplicationEvent {

    private final Long userId;
    private final BigDecimal sleepHours;
    private final Integer condition;

    public MorningCheckinEvent(Object source, Long userId, BigDecimal sleepHours, Integer condition) {
        super(source);
        this.userId = userId;
        this.sleepHours = sleepHours;
        this.condition = condition;
    }
}
