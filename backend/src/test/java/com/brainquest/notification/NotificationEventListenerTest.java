package com.brainquest.notification;

import com.brainquest.event.events.LevelUpEvent;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThatCode;

@DisplayName("NotificationEventListener 단위 테스트")
class NotificationEventListenerTest {

    private final NotificationEventListener listener = new NotificationEventListener();

    @Test
    @DisplayName("레벨업 이벤트 처리 — 예외 없이 로그 출력")
    void handleLevelUp_logsWithoutError() {
        var event = new LevelUpEvent(this, 1L, 5,
                Map.of("gold", 50));

        assertThatCode(() -> listener.handleLevelUp(event))
                .doesNotThrowAnyException();
    }
}
