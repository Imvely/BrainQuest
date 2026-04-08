package com.brainquest.character.service;

import com.brainquest.battle.entity.BattleResult;
import com.brainquest.character.entity.StatType;
import com.brainquest.event.events.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.Map;

/**
 * CHARACTER 모듈 이벤트 리스너.
 *
 * <p>각 모듈에서 발행하는 이벤트를 구독하여 캐릭터 경험치/골드를 지급한다.</p>
 *
 * <p><b>트랜잭션 정책:</b></p>
 * <ul>
 *   <li>GATE 이벤트: {@code AFTER_COMMIT} — 원본 트랜잭션 커밋 후 실행</li>
 *   <li>BATTLE/QUEST/SKY 이벤트: {@code @EventListener} — 발행자 트랜잭션에 참여</li>
 * </ul>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CharacterEventListener {

    private static final int EMOTION_EXP = 5;

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

    // ── BATTLE / QUEST / SKY 이벤트 (발행자 트랜잭션에 참여) ──

    /**
     * 전투 완료 → ATK 경험치 + 골드 지급.
     */
    @EventListener
    public void handleBattleCompleted(BattleCompletedEvent event) {
        try {
            if (event.getExpEarned() > 0) {
                log.debug("전투 경험치 지급: userId={}, exp={}", event.getUserId(), event.getExpEarned());
                characterService.addExp(event.getUserId(), event.getExpEarned(), StatType.ATK);
            }
            if (event.getGoldEarned() > 0) {
                characterService.addGold(event.getUserId(), event.getGoldEarned());
            }
        } catch (Exception e) {
            log.error("전투 완료 경험치/골드 지급 실패: userId={}, {}", event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * 체크포인트 완료 → WIS 경험치 + 골드 지급.
     */
    @EventListener
    public void handleCheckpointCompleted(CheckpointCompletedEvent event) {
        try {
            log.debug("체크포인트 경험치 지급: userId={}, exp={}, gold={}",
                    event.getUserId(), event.getExpReward(), event.getGoldReward());
            characterService.addExp(event.getUserId(), event.getExpReward(), StatType.WIS);
            if (event.getGoldReward() > 0) {
                characterService.addGold(event.getUserId(), event.getGoldReward());
            }
        } catch (Exception e) {
            log.error("체크포인트 경험치/골드 지급 실패: userId={}, {}", event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * 퀘스트 완료 → 잔여 WIS 경험치 + 골드 + 아이템 드롭.
     */
    @EventListener
    public void handleQuestCompleted(QuestCompletedEvent event) {
        try {
            if (event.getExpReward() > 0) {
                log.debug("퀘스트 잔여 경험치 지급: userId={}, exp={}", event.getUserId(), event.getExpReward());
                characterService.addExp(event.getUserId(), event.getExpReward(), StatType.WIS);
            }
            if (event.getGoldReward() > 0) {
                characterService.addGold(event.getUserId(), event.getGoldReward());
            }
            characterService.dropItem(event.getUserId(), event.getGrade());
        } catch (Exception e) {
            log.error("퀘스트 완료 보상 지급 실패: userId={}, {}", event.getUserId(), e.getMessage(), e);
        }
    }

    /**
     * 감정 기록 완료 → DEF 경험치 +5.
     */
    @EventListener
    public void handleEmotionRecorded(EmotionRecordedEvent event) {
        try {
            log.debug("감정 기록 경험치 지급: userId={}, exp={}", event.getUserId(), EMOTION_EXP);
            characterService.addExp(event.getUserId(), EMOTION_EXP, StatType.DEF);
        } catch (Exception e) {
            log.error("감정 기록 경험치 지급 실패: userId={}, {}", event.getUserId(), e.getMessage(), e);
        }
    }
}
