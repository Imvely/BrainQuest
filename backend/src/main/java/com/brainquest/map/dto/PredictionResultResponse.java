package com.brainquest.map.dto;

import java.math.BigDecimal;

public record PredictionResultResponse(
        int predictedMin,
        int actualMin,
        BigDecimal accuracyPct,
        int expEarned
) {
}
