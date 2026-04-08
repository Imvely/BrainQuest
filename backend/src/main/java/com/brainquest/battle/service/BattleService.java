package com.brainquest.battle.service;

import com.brainquest.battle.dto.*;
import com.brainquest.battle.entity.*;
import com.brainquest.battle.repository.BattleExitRepository;
import com.brainquest.battle.repository.BattleSessionRepository;
import com.brainquest.character.dto.UserItemResponse;
import com.brainquest.character.entity.StatType;
import com.brainquest.character.service.CharacterService;
import com.brainquest.common.exception.DuplicateResourceException;
import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.event.events.BattleCompletedEvent;
import com.brainquest.event.events.StreakUpdatedEvent;
import com.brainquest.gate.entity.Streak;
import com.brainquest.gate.entity.StreakType;
import com.brainquest.gate.repository.StreakRepository;
import com.brainquest.quest.entity.Grade;
import com.brainquest.quest.entity.Quest;
import com.brainquest.quest.repository.QuestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 전투 서비스.
 *
 * <p><b>중복 지급 주의:</b> 이 서비스는 {@code characterService.addExp/addGold}를 직접 호출하여
 * 경험치·골드를 지급한다. {@code BattleCompletedEvent}는 QUEST 모듈(체크포인트 자동 완료) 등
 * 연동 목적으로 발행되므로, 이 이벤트를 구독하는 리스너에서 경험치를 추가 지급하면
 * <b>중복 지급</b>이 발생한다. {@code CharacterEventListener}에 BATTLE 이벤트 리스너를
 * 추가하지 말 것.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BattleService {

    private static final Map<Grade, Integer> MONSTER_HP_MAP = Map.of(
            Grade.E, 100,
            Grade.D, 300,
            Grade.C, 600,
            Grade.B, 1200,
            Grade.A, 2400
    );

    private static final Map<Grade, String> MONSTER_TYPE_MAP = Map.of(
            Grade.E, "슬라임",
            Grade.D, "고블린",
            Grade.C, "오크",
            Grade.B, "드래곤",
            Grade.A, "마왕"
    );

    private static final Set<Integer> STREAK_BONUS_DAYS = Set.of(7, 14, 30, 60, 100);

    private final BattleSessionRepository battleSessionRepository;
    private final BattleExitRepository battleExitRepository;
    private final QuestRepository questRepository;
    private final CharacterService characterService;
    private final StreakRepository streakRepository;
    private final ApplicationEventPublisher eventPublisher;

    // ── 전투 시작 ──

    @Transactional
    public StartBattleResponse startBattle(Long userId, StartBattleRequest req) {
        // 진행 중인 세션 확인
        battleSessionRepository.findActiveByUserId(userId).ifPresent(active -> {
            throw new DuplicateResourceException("BATTLE_001", "이미 진행 중인 전투가 있습니다.");
        });

        Grade grade = determineGrade(req);
        int monsterHp = MONSTER_HP_MAP.get(grade);
        String monsterType = MONSTER_TYPE_MAP.get(grade);

        BattleSession session = BattleSession.builder()
                .userId(userId)
                .questId(req.questId())
                .checkpointId(req.checkpointId())
                .plannedMin(req.plannedMin())
                .monsterType(monsterType)
                .monsterMaxHp(monsterHp)
                .build();

        session = battleSessionRepository.save(session);
        log.info("전투 시작: userId={}, sessionId={}, monster={}, hp={}",
                userId, session.getId(), monsterType, monsterHp);

        return StartBattleResponse.from(session);
    }

    // ── 이탈 기록 ──

    @Transactional
    public ExitResponse recordExit(Long userId, Long sessionId) {
        BattleSession session = findActiveSession(userId, sessionId);

        BattleExit exit = BattleExit.builder()
                .sessionId(sessionId)
                .exitAt(LocalDateTime.now())
                .penaltyType(PenaltyType.COMBO_RESET) // 임시, 복귀 시 확정
                .build();

        exit = battleExitRepository.save(exit);
        session.incrementExitCount();
        battleSessionRepository.save(session);

        log.debug("이탈 기록: sessionId={}, exitId={}, exitCount={}",
                sessionId, exit.getId(), session.getExitCount());

        return new ExitResponse(exit.getId());
    }

    // ── 복귀 기록 + 페널티 판정 ──

    @Transactional
    public ReturnResponse recordReturn(Long userId, Long sessionId) {
        BattleSession session = findActiveSession(userId, sessionId);

        BattleExit exit = battleExitRepository
                .findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("BATTLE_003",
                        "이탈 기록을 찾을 수 없습니다."));

        LocalDateTime now = LocalDateTime.now();
        int durationSec = (int) Duration.between(exit.getExitAt(), now).toSeconds();

        // 페널티 판정
        PenaltyType penalty = determinePenalty(durationSec);

        // 페널티 적용
        if (penalty == PenaltyType.HP_RECOVER) {
            int recoverAmount = (int) (session.getMonsterMaxHp() * 0.1);
            session.recoverMonsterHp(recoverAmount);
            log.debug("몬스터 HP 회복: +{}, remaining={}", recoverAmount, session.getMonsterRemainingHp());
        } else if (penalty == PenaltyType.HP_DAMAGE) {
            // 60~120초: 몬스터 HP 20% 회복, 120~300초: 몬스터 HP 50% 회복
            double recoverRate = durationSec <= 120 ? 0.2 : 0.5;
            int recoverAmount = (int) (session.getMonsterMaxHp() * recoverRate);
            session.recoverMonsterHp(recoverAmount);
            log.debug("HP_DAMAGE 페널티: 몬스터 HP {}% 회복 (+{}), remaining={}",
                    (int) (recoverRate * 100), recoverAmount, session.getMonsterRemainingHp());
        } else if (penalty == PenaltyType.DEFEAT) {
            // >300초: 자동 패배 처리
            exit.recordReturn(now, durationSec, PenaltyType.DEFEAT);
            battleExitRepository.save(exit);
            session.addExitDuration(durationSec);
            session.autoDefeat();
            battleSessionRepository.save(session);

            log.info("자동 패배: sessionId={}, durationSec={}", sessionId, durationSec);

            return new ReturnResponse(PenaltyType.DEFEAT, durationSec,
                    session.getMonsterRemainingHp(), 0);
        }

        exit.recordReturn(now, durationSec, penalty);
        battleExitRepository.save(exit);
        session.addExitDuration(durationSec);
        battleSessionRepository.save(session);

        // 남은 시간 계산
        int elapsedSec = (int) Duration.between(session.getStartedAt(), now).toSeconds();
        int activeElapsedSec = elapsedSec - session.getTotalExitSec();
        int remainingTimeSec = Math.max(0, (session.getPlannedMin() * 60) - activeElapsedSec);

        log.debug("복귀: sessionId={}, penalty={}, durationSec={}, remaining={}s",
                sessionId, penalty, durationSec, remainingTimeSec);

        return new ReturnResponse(penalty, durationSec,
                session.getMonsterRemainingHp(), remainingTimeSec);
    }

    // ── 전투 종료 ──

    @Transactional
    public EndBattleResponse endBattle(Long userId, Long sessionId, EndBattleRequest req) {
        BattleSession session = findOwnedSession(userId, sessionId);

        if (!session.isActive()) {
            throw new IllegalArgumentException("이미 종료된 전투입니다.");
        }

        // actualMin 계산: 총 경과 시간 - 이탈 시간
        LocalDateTime now = LocalDateTime.now();
        int elapsedSec = (int) Duration.between(session.getStartedAt(), now).toSeconds();
        int actualMin = Math.max(1, (elapsedSec - session.getTotalExitSec()) / 60);

        // maxCombo 검증: actualMin / 5 이하
        int maxAllowedCombo = actualMin / 5;
        int validatedCombo = Math.min(req.maxCombo(), maxAllowedCombo);

        // 보상 계산
        int expEarned = 0;
        int goldEarned = 0;

        switch (req.result()) {
            case VICTORY -> {
                int baseExp = session.getPlannedMin() * 2;
                double comboBonus = validatedCombo >= 5 ? 0.5
                        : validatedCombo >= 3 ? 0.3
                        : validatedCombo >= 1 ? 0.1 : 0;
                double perfectBonus = session.getExitCount() == 0 ? 0.5 : 0;
                expEarned = (int) (baseExp * (1 + comboBonus + perfectBonus));
                goldEarned = baseExp / 2;
            }
            case DEFEAT -> {
                expEarned = (int) (session.getPlannedMin() * 2 * 0.3);
                goldEarned = 0;
            }
            case ABANDON -> {
                expEarned = 0;
                goldEarned = 0;
            }
        }

        // 아이템 드롭 (VICTORY 시에만)
        UserItemResponse itemDrop = null;
        List<Map<String, Object>> itemDrops = null;

        if (req.result() == BattleResult.VICTORY) {
            Grade grade = determineGradeFromSession(session);
            itemDrop = characterService.dropItem(userId, grade.name());
            if (itemDrop != null) {
                itemDrops = new ArrayList<>();
                itemDrops.add(Map.of(
                        "itemId", itemDrop.item().id(),
                        "name", itemDrop.item().name(),
                        "rarity", itemDrop.item().rarity().name()
                ));
            }
        }

        // 세션 업데이트
        session.endBattle(req.result(), actualMin, validatedCombo,
                expEarned, goldEarned, itemDrops);
        battleSessionRepository.save(session);

        // 레벨업 감지를 위해 현재 레벨 기록 (DB 조회 1회로 통합)
        var prevCharacter = characterService.getCharacter(userId);
        int prevLevel = prevCharacter.level();

        // 경험치/골드 지급
        if (expEarned > 0) {
            characterService.addExp(userId, expEarned, StatType.ATK);
        }
        if (goldEarned > 0) {
            characterService.addGold(userId, goldEarned);
        }

        // 레벨업 확인 (경험치 지급 후에만 재조회)
        Integer levelUp = null;
        if (expEarned > 0) {
            int newLevel = characterService.getCharacter(userId).level();
            levelUp = newLevel > prevLevel ? newLevel : null;
        }

        // 스트릭 갱신 (VICTORY만)
        if (req.result() == BattleResult.VICTORY) {
            updateBattleStreak(userId);
        }

        // 이벤트 발행
        eventPublisher.publishEvent(new BattleCompletedEvent(
                this, userId, sessionId, req.result(),
                expEarned, goldEarned,
                session.getCheckpointId(), session.getQuestId()));

        log.info("전투 종료: userId={}, sessionId={}, result={}, exp={}, gold={}, combo={}",
                userId, sessionId, req.result(), expEarned, goldEarned, validatedCombo);

        return new EndBattleResponse(
                req.result(), actualMin, expEarned, goldEarned,
                validatedCombo, session.getExitCount(),
                session.getExitCount() == 0,
                levelUp, itemDrop);
    }

    // ── 전투 기록 조회 ──

    public List<BattleHistoryResponse> getBattleHistory(Long userId, LocalDate from, LocalDate to) {
        LocalDateTime fromDt = from.atStartOfDay();
        LocalDateTime toDt = to.plusDays(1).atStartOfDay();

        List<BattleSession> sessions = battleSessionRepository
                .findAllByUserIdAndStartedAtBetween(userId, fromDt, toDt);

        // 퀘스트 제목 조회 (N+1 방지)
        List<Long> questIds = sessions.stream()
                .map(BattleSession::getQuestId)
                .filter(qid -> qid != null)
                .distinct()
                .toList();

        Map<Long, String> questTitleMap = new java.util.HashMap<>();
        if (!questIds.isEmpty()) {
            questRepository.findAllById(questIds).forEach(
                    q -> questTitleMap.put(q.getId(), q.getQuestTitle()));
        }

        return sessions.stream()
                .map(s -> BattleHistoryResponse.of(s, questTitleMap.get(s.getQuestId())))
                .toList();
    }

    // ── private helpers ──

    private BattleSession findActiveSession(Long userId, Long sessionId) {
        BattleSession session = findOwnedSession(userId, sessionId);
        if (!session.isActive()) {
            throw new IllegalArgumentException("이미 종료된 전투입니다.");
        }
        return session;
    }

    private BattleSession findOwnedSession(Long userId, Long sessionId) {
        return battleSessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("BATTLE_002",
                        "전투 세션을 찾을 수 없습니다."));
    }

    private Grade determineGrade(StartBattleRequest req) {
        // 퀘스트 연결 시 퀘스트의 grade 사용
        if (req.questId() != null) {
            Quest quest = questRepository.findById(req.questId())
                    .orElseThrow(() -> new EntityNotFoundException("BATTLE_004",
                            "퀘스트를 찾을 수 없습니다."));
            return quest.getGrade();
        }

        // 퀘스트 미연결: plannedMin 기반 자동 결정
        int min = req.plannedMin();
        if (min <= 10) return Grade.E;
        if (min <= 20) return Grade.D;
        if (min <= 30) return Grade.C;
        if (min <= 45) return Grade.B;
        return Grade.A;
    }

    private Grade determineGradeFromSession(BattleSession session) {
        if (session.getQuestId() != null) {
            return questRepository.findById(session.getQuestId())
                    .map(Quest::getGrade)
                    .orElse(Grade.E);
        }
        int min = session.getPlannedMin();
        if (min <= 10) return Grade.E;
        if (min <= 20) return Grade.D;
        if (min <= 30) return Grade.C;
        if (min <= 45) return Grade.B;
        return Grade.A;
    }

    private PenaltyType determinePenalty(int durationSec) {
        if (durationSec <= 30) return PenaltyType.COMBO_RESET;
        if (durationSec <= 60) return PenaltyType.HP_RECOVER;
        if (durationSec <= 300) return PenaltyType.HP_DAMAGE;
        return PenaltyType.DEFEAT;
    }

    private void updateBattleStreak(Long userId) {
        Streak streak = streakRepository.findByUserIdAndStreakType(userId, StreakType.BATTLE)
                .orElseGet(() -> streakRepository.save(Streak.builder()
                        .userId(userId)
                        .streakType(StreakType.BATTLE)
                        .build()));

        LocalDate today = LocalDate.now();
        int count = streak.recordToday(today);
        streakRepository.save(streak);

        boolean isBonus = STREAK_BONUS_DAYS.contains(count);

        eventPublisher.publishEvent(
                new StreakUpdatedEvent(this, userId, StreakType.BATTLE, count, isBonus));
    }
}
