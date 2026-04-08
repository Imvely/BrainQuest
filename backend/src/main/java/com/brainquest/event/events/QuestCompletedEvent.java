package com.brainquest.event.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 퀘스트 완료 이벤트.
 *
 * <p>발행: QUEST</p>
 * <p>구독: CHARACTER(WIS 경험치 + 골드 + 아이템 드롭), MAP(타임블록 자동 완료)</p>
 *
 * <p>{@code expReward}와 {@code goldReward}는 체크포인트에서 이미 분배된 몫을 제외한
 * 잔여 보상 값이다.</p>
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
