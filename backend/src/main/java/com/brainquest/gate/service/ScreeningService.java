package com.brainquest.gate.service;

import com.brainquest.event.events.ScreeningCompletedEvent;
import com.brainquest.gate.dto.ScreeningRequest;
import com.brainquest.gate.dto.ScreeningResponse;
import com.brainquest.gate.entity.RiskLevel;
import com.brainquest.gate.entity.ScreeningResult;
import com.brainquest.gate.repository.ScreeningResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * ASRS 스크리닝 서비스.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ScreeningService {

    private static final int SCREENING_EXP = 30;

    private final ScreeningResultRepository screeningResultRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * 스크리닝 결과를 제출한다.
     * <p>ASRS 점수를 합산하여 위험 수준을 판정하고, 캐릭터 경험치를 부여한다.</p>
     */
    @Transactional
    public ScreeningResponse submitScreening(Long userId, ScreeningRequest request) {
        validateAnswers(request);

        int totalScore = request.answers().values().stream()
                .mapToInt(Integer::intValue)
                .sum();

        RiskLevel riskLevel = calculateRiskLevel(totalScore);

        ScreeningResult result = ScreeningResult.builder()
                .userId(userId)
                .testType(request.testType())
                .answers(request.answers())
                .totalScore(totalScore)
                .riskLevel(riskLevel)
                .build();

        result = screeningResultRepository.save(result);

        eventPublisher.publishEvent(new ScreeningCompletedEvent(this, userId, SCREENING_EXP));

        return ScreeningResponse.from(result);
    }

    /**
     * 사용자의 스크리닝 기록을 최신순으로 조회한다.
     */
    public List<ScreeningResponse> getHistory(Long userId) {
        return screeningResultRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(ScreeningResponse::from)
                .toList();
    }

    private void validateAnswers(ScreeningRequest request) {
        if (request.answers().isEmpty()) {
            throw new IllegalArgumentException("answers는 비어있을 수 없습니다.");
        }
        for (var entry : request.answers().entrySet()) {
            if (entry.getValue() == null || entry.getValue() < 0 || entry.getValue() > 4) {
                throw new IllegalArgumentException(
                        entry.getKey() + "의 값은 0~4 범위여야 합니다.");
            }
        }
    }

    private RiskLevel calculateRiskLevel(int totalScore) {
        if (totalScore >= 14) return RiskLevel.HIGH;
        if (totalScore >= 10) return RiskLevel.MEDIUM;
        return RiskLevel.LOW;
    }
}
