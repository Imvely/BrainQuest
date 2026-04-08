package com.brainquest.event.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 퀘스트 완료 이벤트.
 * <p>발행: QUEST → 구독: CHARACTER(WIS 경험치 + 아이템 드롭), MAP(타임블록 완료)</p>
 */
@Getter
public class QuestCompletedEvent extends ApplicationEvent {

    private final Long userId;
    private final Long questId;
    private final String grade;
    private final int expReward;
    private final int goldReward;

    public QuestCompletedEvent(Object source, Long userId, Long questId,
                               String grade, int expReward, int goldReward) {
        super(source);
        this.userId = userId;
        this.questId = questId;
        this.grade = grade;
        this.expReward = expReward;
        this.goldReward = goldReward;
    }
}
