package com.brainquest.notification;

import com.brainquest.event.events.LevelUpEvent;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * 알림 이벤트 리스너.
 *
 * <p>레벨업 등 알림이 필요한 이벤트를 구독한다.
 * MVP에서는 로그만 남기고, Phase 9에서 FCM 푸시로 전환 예정.</p>
 */
@Slf4j
@Component
public class NotificationEventListener {

    @EventListener
    public void handleLevelUp(LevelUpEvent event) {
        try {
            log.info("User {} leveled up to {}, rewards={}",
                    event.getUserId(), event.getNewLevel(), event.getRewards());
        } catch (Exception e) {
            log.error("레벨업 알림 처리 실패: userId={}, level={}, {}",
                    event.getUserId(), event.getNewLevel(), e.getMessage(), e);
        }
    }
}
