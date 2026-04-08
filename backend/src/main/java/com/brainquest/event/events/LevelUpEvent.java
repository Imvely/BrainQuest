package com.brainquest.event.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.util.Map;

/**
 * 레벨업 이벤트.
 * <p>발행: CHARACTER → 구독: NOTIFICATION(축하 푸시)</p>
 */
@Getter
public class LevelUpEvent extends ApplicationEvent {

    private final Long userId;
    private final int newLevel;
    private final Map<String, Object> rewards;

    public LevelUpEvent(Object source, Long userId, int newLevel, Map<String, Object> rewards) {
        super(source);
        this.userId = userId;
        this.newLevel = newLevel;
        this.rewards = rewards;
    }
}
