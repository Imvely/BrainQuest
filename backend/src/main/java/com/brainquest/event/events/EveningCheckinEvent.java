package com.brainquest.event.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 저녁 체크인 완료 이벤트.
 *
 * <p>발행: GATE</p>
 * <p>구독: CHARACTER</p>
 */
@Getter
public class EveningCheckinEvent extends ApplicationEvent {

    private final Long userId;
    private final Integer focusScore;
    private final Integer impulsivityScore;
    private final Integer emotionScore;

    public EveningCheckinEvent(Object source, Long userId,
                               Integer focusScore, Integer impulsivityScore,
                               Integer emotionScore) {
        super(source);
        this.userId = userId;
        this.focusScore = focusScore;
        this.impulsivityScore = impulsivityScore;
        this.emotionScore = emotionScore;
    }
}
