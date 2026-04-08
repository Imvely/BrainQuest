package com.brainquest.map.dto;

import java.time.LocalTime;

public record RemainingTimeResponse(
        int remainingMin,
        LocalTime sleepTime
) {
}
