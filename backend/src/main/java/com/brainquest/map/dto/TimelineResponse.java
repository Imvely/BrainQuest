package com.brainquest.map.dto;

import java.util.List;

public record TimelineResponse(
        List<BlockResponse> blocks,
        int remainingMin,
        QuestSummary questSummary,
        List<BattleSessionSummary> battleSessions,
        List<EmotionSummary> emotionRecords
) {

    public record QuestSummary(int completed, int total) {
    }

    public record BattleSessionSummary(
            Long id,
            String monsterType,
            String result,
            int plannedMin,
            Integer actualMin
    ) {
    }

    public record EmotionSummary(
            Long id,
            String weatherType,
            int intensity,
            String memo
    ) {
    }
}
