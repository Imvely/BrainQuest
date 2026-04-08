package com.brainquest.event.events;

import com.brainquest.sky.entity.WeatherType;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 감정 기록 완료 이벤트.
 *
 * <p>발행: SKY</p>
 * <p>구독: CHARACTER(DEF 경험치 +5)</p>
 */
@Getter
public class EmotionRecordedEvent extends ApplicationEvent {

    private final Long userId;
    private final WeatherType weatherType;
    private final int intensity;

    public EmotionRecordedEvent(Object source, Long userId,
                                WeatherType weatherType, int intensity) {
        super(source);
        this.userId = userId;
        this.weatherType = weatherType;
        this.intensity = intensity;
    }
}
