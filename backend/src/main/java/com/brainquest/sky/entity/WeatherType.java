package com.brainquest.sky.entity;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum WeatherType {

    SUNNY(7),
    PARTLY_CLOUDY(6),
    CLOUDY(5),
    FOG(4),
    RAIN(3),
    THUNDER(2),
    STORM(1);

    private final int numericValue;

    /**
     * 수치에 가장 가까운 WeatherType을 반환한다.
     */
    public static WeatherType fromNumericValue(double value) {
        WeatherType closest = SUNNY;
        double minDiff = Double.MAX_VALUE;
        for (WeatherType wt : values()) {
            double diff = Math.abs(wt.numericValue - value);
            if (diff < minDiff) {
                minDiff = diff;
                closest = wt;
            }
        }
        return closest;
    }
}
