package com.brainquest.map.dto;

import com.brainquest.map.entity.TimePrediction;

public record PredictionResponse(
        Long id,
        Long blockId,
        int predictedMin
) {
    public static PredictionResponse from(TimePrediction prediction) {
        return new PredictionResponse(
                prediction.getId(),
                prediction.getTimeBlock().getId(),
                prediction.getPredictedMin()
        );
    }
}
