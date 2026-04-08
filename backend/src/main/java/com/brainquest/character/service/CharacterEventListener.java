package com.brainquest.character.service;

import com.brainquest.character.entity.StatType;
import com.brainquest.event.events.CheckinCompletedEvent;
import com.brainquest.event.events.MedLogCompletedEvent;
import com.brainquest.event.events.ScreeningCompletedEvent;
import com.brainquest.event.events.StreakUpdatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

/**
 * CHARACTER 모듈 이벤트 리스너.
 *
 * <p>GATE 모듈에서 발행하는 이벤트를 구독하여 캐릭터 경험치를 지급한다.</p>
 *
 * <p><b>트랜잭션 안전:</b> {@code AFTER_COMMIT}으로 동작하여, 원본 트랜잭션 커밋 후에만
 * 경험치가 지급된다. 이를 통해 롤백 시 경험치 유실/오지급을 방지한다.</p>
 *
 * <p><b>중복 지급 주의:</b></p>
 * <ul>
 *   <li>GATE 이벤트: 이 리스너에서만 경험치 지급 (서비스에서 직접 호출하지 않음)</li>
 *   <li>QUEST 이벤트: QuestService가 CharacterService를 직접 호출하므로
 *       여기에 리스너를 추가하면 <b>중복 지급</b> 발생</li>
 *   <li>BATTLE 이벤트: BattleService 구현 시 동일 원칙 적용</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CharacterEventListener {

    private static final Map<Integer, Integer> STREAK_BONUS_MAP = Map.of(
            7, 50, 14, 100, 30, 200, 60, 500, 100, 1000
    );

    private final CharacterService characterService;

    /**
     * 체크인 완료 → HP 경험치 지급.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleCheckinCompleted(CheckinCompletedEvent event) {
        try {
            log.debug("체크인 경험치 지급: userId={}, exp={}", event.getUserId(), event.getExpReward());
            characterService.addExp(event.getUserId(), event.getExpReward(), StatType.HP);
        } catch (Exception e) {
            log.error("체크인 경험치 지급 실패: userId={}, exp={}",
                    event.getUserId(), event.getExpReward(), e);
        }
    }

    /**
     * 스크리닝 완료 → HP 경험치 지급.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleScreeningCompleted(ScreeningCompletedEvent event) {
        try {
            log.debug("스크리닝 경험치 지급: userId={}, exp={}", event.getUserId(), event.getExpReward());
            characterService.addExp(event.getUserId(), event.getExpReward(), StatType.HP);
        } catch (Exception e) {
            log.error("스크리닝 경험치 지급 실패: userId={}, exp={}",
                    event.getUserId(), event.getExpReward(), e);
        }
    }

    /**
     * 약물 복용 기록 → HP 경험치 지급.
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleMedLogCompleted(MedLogCompletedEvent event) {
        try {
            log.debug("복용 기록 경험치 지급: userId={}, exp={}", event.getUserId(), event.getExpReward());
            characterService.addExp(event.getUserId(), event.getExpReward(), StatType.HP);
        } catch (Exception e) {
            log.error("복용 기록 경험치 지급 실패: userId={}, exp={}",
                    event.getUserId(), event.getExpReward(), e);
        }
    }

    /**
     * 스트릭 보너스 달성 → HP 보너스 경험치 지급.
     * <p>보너스 조건이 아닌 일반 갱신은 무시한다.</p>
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleStreakUpdated(StreakUpdatedEvent event) {
        if (!event.isBonus()) {
            return;
        }
        Integer bonusExp = STREAK_BONUS_MAP.get(event.getCurrentCount());
        if (bonusExp == null) {
            return;
        }
        try {
            log.info("스트릭 보너스 지급: userId={}, count={}, exp={}",
                    event.getUserId(), event.getCurrentCount(), bonusExp);
            characterService.addExp(event.getUserId(), bonusExp, StatType.HP);
        } catch (Exception e) {
            log.error("스트릭 보너스 경험치 지급 실패: userId={}, count={}, exp={}",
                    event.getUserId(), event.getCurrentCount(), bonusExp, e);
        }
    }
}
