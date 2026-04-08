package com.brainquest.event.events;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 퀘스트 완료 이벤트.
 *
 * <p>발행: QUEST</p>
 * <p>구독: MAP(타임블록 자동 완료)</p>
 *
 * <p><b>중복 지급 주의:</b> 경험치/골드/아이템 드롭은 {@code QuestService}가
 * {@code CharacterService}를 직접 호출하여 지급한다.
 * 이 이벤트를 구독하는 리스너에서 경험치를 추가 지급하면 중복 발생.</p>
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
