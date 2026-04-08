package com.brainquest.event.events;

import com.brainquest.sky.entity.WeatherType;
import lombok.Getter;
import org.springframework.context.ApplicationEvent;

/**
 * 감정 기록 완료 이벤트.
 *
 * <p>발행: SKY</p>
 * <p>구독: CHARACTER(DEF 경험치 +5)</p>
 *
 * <p><b>중복 지급 주의:</b> DEF 경험치는 {@code EmotionService}가
 * {@code CharacterService.addExp()}를 직접 호출하여 지급한다.
 * 이 이벤트를 구독하는 리스너에서 경험치를 추가 지급하면 중복 발생.</p>
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
