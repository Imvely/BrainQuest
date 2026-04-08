package com.brainquest.event.events;

import com.brainquest.gate.entity.StreakType;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 스트릭 갱신 이벤트.
 * <p>발행: GATE → 구독: CHARACTER(보너스 경험치/아이템)</p>
 */
@Getter
public class StreakUpdatedEvent extends ApplicationEvent {

    private final Long userId;
    private final StreakType streakType;
    private final int currentCount;
    private final boolean bonus;

    public StreakUpdatedEvent(Object source, Long userId, StreakType streakType,
                             int currentCount, boolean bonus) {
        super(source);
        this.userId = userId;
        this.streakType = streakType;
        this.currentCount = currentCount;
        this.bonus = bonus;
    }
}
