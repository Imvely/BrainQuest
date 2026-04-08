package com.brainquest.map.service;

import com.brainquest.character.entity.StatType;
import com.brainquest.character.service.CharacterService;
import com.brainquest.common.exception.DuplicateResourceException;
import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.map.dto.PredictionResponse;
import com.brainquest.map.dto.PredictionResultResponse;
import com.brainquest.map.dto.RecordPredictionRequest;
import com.brainquest.map.entity.TimeBlock;
import com.brainquest.map.entity.TimePrediction;
import com.brainquest.map.repository.TimeBlockRepository;
import com.brainquest.map.repository.TimePredictionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TimePredictionService {

    private static final int ACCURACY_BONUS_THRESHOLD = 5;
    private static final int ACCURACY_BONUS_EXP = 15;

    private final TimePredictionRepository timePredictionRepository;
    private final TimeBlockRepository timeBlockRepository;
    private final CharacterService characterService;

    @Transactional
    public PredictionResponse recordPrediction(Long userId, RecordPredictionRequest req) {
        TimeBlock block = timeBlockRepository.findByIdAndUserId(req.blockId(), userId)
                .orElseThrow(() -> new EntityNotFoundException("MAP_004", "타임블록을 찾을 수 없습니다."));

        TimePrediction prediction = TimePrediction.builder()
                .userId(userId)
                .timeBlock(block)
                .predictedMin(req.predictedMin())
                .build();

        prediction = timePredictionRepository.save(prediction);
        log.debug("시간 예측 기록: userId={}, blockId={}, predicted={}분", userId, req.blockId(), req.predictedMin());
        return PredictionResponse.from(prediction);
    }

    @Transactional
    public PredictionResultResponse recordActual(Long userId, Long predictionId, int actualMin) {
        TimePrediction prediction = timePredictionRepository.findByIdAndUserId(predictionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("MAP_005", "시간 예측 기록을 찾을 수 없습니다."));

        if (prediction.getActualMin() != null) {
            throw new DuplicateResourceException("MAP_006", "이미 실제 시간이 기록되어 있습니다.");
        }

        prediction.recordActual(actualMin);
        timePredictionRepository.save(prediction);

        // 정확도 보너스: |predicted - actual| <= 5 → AGI 경험치
        int expEarned = 0;
        if (Math.abs(prediction.getPredictedMin() - actualMin) <= ACCURACY_BONUS_THRESHOLD) {
            characterService.addExp(userId, ACCURACY_BONUS_EXP, StatType.AGI);
            expEarned = ACCURACY_BONUS_EXP;
            log.info("시간 예측 정확! 보너스 지급: userId={}, exp={}", userId, expEarned);
        }

        log.debug("실제 시간 기록: userId={}, predicted={}분, actual={}분, accuracy={}%",
                userId, prediction.getPredictedMin(), actualMin, prediction.getAccuracyPct());

        return new PredictionResultResponse(
                prediction.getPredictedMin(),
                actualMin,
                prediction.getAccuracyPct(),
                expEarned
        );
    }
}
