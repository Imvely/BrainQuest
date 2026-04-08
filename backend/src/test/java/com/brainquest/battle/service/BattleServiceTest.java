package com.brainquest.battle.service;

import com.brainquest.battle.dto.*;
import com.brainquest.battle.entity.*;
import com.brainquest.battle.repository.BattleExitRepository;
import com.brainquest.battle.repository.BattleSessionRepository;
import com.brainquest.character.dto.CharacterResponse;
import com.brainquest.character.dto.ItemResponse;
import com.brainquest.character.dto.UserItemResponse;
import com.brainquest.character.entity.ItemRarity;
import com.brainquest.character.entity.ItemSlot;
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
import com.brainquest.quest.entity.QuestCategory;
import com.brainquest.quest.repository.QuestRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BattleService 단위 테스트")
class BattleServiceTest {

    @InjectMocks
    private BattleService battleService;

    @Mock
    private BattleSessionRepository battleSessionRepository;

    @Mock
    private BattleExitRepository battleExitRepository;

    @Mock
    private QuestRepository questRepository;

    @Mock
    private CharacterService characterService;

    @Mock
    private StreakRepository streakRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    // ── 헬퍼 메서드 ──

    private BattleSession createSession(Long userId, int plannedMin, String monsterType, int monsterHp) {
        BattleSession session = BattleSession.builder()
                .userId(userId)
                .plannedMin(plannedMin)
                .monsterType(monsterType)
                .monsterMaxHp(monsterHp)
                .build();
        ReflectionTestUtils.setField(session, "id", 1L);
        return session;
    }

    private BattleSession createSessionWithQuest(Long userId, int plannedMin, Long questId, Long checkpointId) {
        BattleSession session = BattleSession.builder()
                .userId(userId)
                .questId(questId)
                .checkpointId(checkpointId)
                .plannedMin(plannedMin)
                .monsterType("오크")
                .monsterMaxHp(600)
                .build();
        ReflectionTestUtils.setField(session, "id", 1L);
        return session;
    }

    private BattleExit createExit(Long sessionId, LocalDateTime exitAt) {
        BattleExit exit = BattleExit.builder()
                .sessionId(sessionId)
                .exitAt(exitAt)
                .penaltyType(PenaltyType.COMBO_RESET)
                .build();
        ReflectionTestUtils.setField(exit, "id", 1L);
        return exit;
    }

    private Quest createQuest(Grade grade) {
        Quest quest = Quest.builder()
                .userId(1L)
                .originalTitle("할 일")
                .questTitle("퀘스트")
                .questStory("스토리")
                .category(QuestCategory.WORK)
                .grade(grade)
                .estimatedMin(30)
                .expReward(25)
                .goldReward(15)
                .build();
        ReflectionTestUtils.setField(quest, "id", 10L);
        return quest;
    }

    private CharacterResponse mockCharResponse(int level) {
        return new CharacterResponse(
                1L, "전사", null, level, 0, 100,
                new CharacterResponse.StatsResponse(10, 10, 10, 10, 100),
                0, Map.of(), Map.of());
    }

    private void stubSaveSession() {
        given(battleSessionRepository.save(any(BattleSession.class)))
                .willAnswer(inv -> {
                    BattleSession s = inv.getArgument(0);
                    if (s.getId() == null) {
                        ReflectionTestUtils.setField(s, "id", 1L);
                    }
                    return s;
                });
    }

    private void stubSaveExit() {
        given(battleExitRepository.save(any(BattleExit.class)))
                .willAnswer(inv -> {
                    BattleExit e = inv.getArgument(0);
                    if (e.getId() == null) {
                        ReflectionTestUtils.setField(e, "id", 1L);
                    }
                    return e;
                });
    }

    // ──────────────────────────────────────────────
    // startBattle
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("startBattle")
    class StartBattle {

        @Test
        @DisplayName("퀘스트 미연결 10분 → E등급, 슬라임 HP=100")
        void noQuest_10min_gradeE() {
            // given
            var req = new StartBattleRequest(10, null, null);
            given(battleSessionRepository.findActiveByUserId(1L)).willReturn(Optional.empty());
            stubSaveSession();

            // when
            StartBattleResponse res = battleService.startBattle(1L, req);

            // then
            assertThat(res.monster().type()).isEqualTo("슬라임");
            assertThat(res.monster().maxHp()).isEqualTo(100);
            assertThat(res.plannedMin()).isEqualTo(10);
        }

        @Test
        @DisplayName("퀘스트 미연결 15분 → D등급, 고블린 HP=300")
        void noQuest_15min_gradeD() {
            var req = new StartBattleRequest(15, null, null);
            given(battleSessionRepository.findActiveByUserId(1L)).willReturn(Optional.empty());
            stubSaveSession();

            StartBattleResponse res = battleService.startBattle(1L, req);

            assertThat(res.monster().type()).isEqualTo("고블린");
            assertThat(res.monster().maxHp()).isEqualTo(300);
        }

        @Test
        @DisplayName("퀘스트 미연결 25분 → C등급, 오크 HP=600")
        void noQuest_25min_gradeC() {
            var req = new StartBattleRequest(25, null, null);
            given(battleSessionRepository.findActiveByUserId(1L)).willReturn(Optional.empty());
            stubSaveSession();

            StartBattleResponse res = battleService.startBattle(1L, req);

            assertThat(res.monster().type()).isEqualTo("오크");
            assertThat(res.monster().maxHp()).isEqualTo(600);
        }

        @Test
        @DisplayName("퀘스트 미연결 40분 → B등급, 드래곤 HP=1200")
        void noQuest_40min_gradeB() {
            var req = new StartBattleRequest(40, null, null);
            given(battleSessionRepository.findActiveByUserId(1L)).willReturn(Optional.empty());
            stubSaveSession();

            StartBattleResponse res = battleService.startBattle(1L, req);

            assertThat(res.monster().type()).isEqualTo("드래곤");
            assertThat(res.monster().maxHp()).isEqualTo(1200);
        }

        @Test
        @DisplayName("퀘스트 미연결 50분 → A등급, 마왕 HP=2400")
        void noQuest_50min_gradeA() {
            var req = new StartBattleRequest(50, null, null);
            given(battleSessionRepository.findActiveByUserId(1L)).willReturn(Optional.empty());
            stubSaveSession();

            StartBattleResponse res = battleService.startBattle(1L, req);

            assertThat(res.monster().type()).isEqualTo("마왕");
            assertThat(res.monster().maxHp()).isEqualTo(2400);
        }

        @Test
        @DisplayName("퀘스트 연결 — 퀘스트 grade 사용")
        void withQuest_usesQuestGrade() {
            // given
            Quest quest = createQuest(Grade.B);
            var req = new StartBattleRequest(15, 10L, null);

            given(battleSessionRepository.findActiveByUserId(1L)).willReturn(Optional.empty());
            given(questRepository.findById(10L)).willReturn(Optional.of(quest));
            stubSaveSession();

            // when
            StartBattleResponse res = battleService.startBattle(1L, req);

            // then — B등급 (퀘스트 grade 우선, plannedMin 무시)
            assertThat(res.monster().type()).isEqualTo("드래곤");
            assertThat(res.monster().maxHp()).isEqualTo(1200);
        }

        @Test
        @DisplayName("진행 중인 전투 존재 — DuplicateResourceException")
        void activeBattleExists_throws() {
            // given
            BattleSession active = createSession(1L, 25, "오크", 600);
            var req = new StartBattleRequest(10, null, null);

            given(battleSessionRepository.findActiveByUserId(1L)).willReturn(Optional.of(active));

            // when & then
            assertThatThrownBy(() -> battleService.startBattle(1L, req))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("이미 진행 중인 전투");

            verify(battleSessionRepository, never()).save(any());
        }

        @Test
        @DisplayName("퀘스트 연결 but 퀘스트 없음 — EntityNotFoundException")
        void questNotFound_throws() {
            var req = new StartBattleRequest(15, 99L, null);

            given(battleSessionRepository.findActiveByUserId(1L)).willReturn(Optional.empty());
            given(questRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> battleService.startBattle(1L, req))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("퀘스트를 찾을 수 없습니다.");
        }
    }

    // ──────────────────────────────────────────────
    // recordExit
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("recordExit")
    class RecordExit {

        @Test
        @DisplayName("정상 — 이탈 기록 생성, exitCount 증가")
        void success() {
            // given
            BattleSession session = createSession(1L, 25, "오크", 600);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveExit();
            stubSaveSession();

            // when
            ExitResponse res = battleService.recordExit(1L, 1L);

            // then
            assertThat(res.exitId()).isEqualTo(1L);
            assertThat(session.getExitCount()).isEqualTo(1);

            verify(battleExitRepository).save(any(BattleExit.class));
            verify(battleSessionRepository).save(session);
        }

        @Test
        @DisplayName("연속 이탈 — exitCount 누적")
        void multipleExits_countAccumulates() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            session.incrementExitCount(); // 기존 1회

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveExit();
            stubSaveSession();

            battleService.recordExit(1L, 1L);

            assertThat(session.getExitCount()).isEqualTo(2);
        }

        @Test
        @DisplayName("세션 없음 — EntityNotFoundException")
        void sessionNotFound_throws() {
            given(battleSessionRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> battleService.recordExit(1L, 99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("전투 세션을 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("이미 종료된 전투 — IllegalArgumentException")
        void alreadyEnded_throws() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            session.autoDefeat(); // 이미 종료

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));

            assertThatThrownBy(() -> battleService.recordExit(1L, 1L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("이미 종료된 전투");
        }
    }

    // ──────────────────────────────────────────────
    // recordReturn
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("recordReturn")
    class RecordReturn {

        @Test
        @DisplayName("≤30초 이탈 → COMBO_RESET, 몬스터 HP 유지")
        void under30sec_comboReset() {
            // given
            BattleSession session = createSession(1L, 25, "오크", 600);
            // 20초 전에 이탈
            BattleExit exit = createExit(1L, LocalDateTime.now().minusSeconds(20));

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            given(battleExitRepository.findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(1L))
                    .willReturn(Optional.of(exit));
            stubSaveExit();
            stubSaveSession();

            // when
            ReturnResponse res = battleService.recordReturn(1L, 1L);

            // then
            assertThat(res.penaltyType()).isEqualTo(PenaltyType.COMBO_RESET);
            assertThat(res.monsterRemainingHp()).isEqualTo(600); // 변화 없음
            assertThat(res.durationSec()).isBetween(19, 22);
        }

        @Test
        @DisplayName("31~60초 이탈 → HP_RECOVER, 몬스터 HP 10% 회복")
        void between31and60_hpRecover() {
            // given
            BattleSession session = createSession(1L, 25, "오크", 600);
            // 몬스터 HP를 400으로 세팅 (이미 데미지를 받은 상태)
            ReflectionTestUtils.setField(session, "monsterRemainingHp", 400);

            BattleExit exit = createExit(1L, LocalDateTime.now().minusSeconds(45));

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            given(battleExitRepository.findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(1L))
                    .willReturn(Optional.of(exit));
            stubSaveExit();
            stubSaveSession();

            // when
            ReturnResponse res = battleService.recordReturn(1L, 1L);

            // then
            assertThat(res.penaltyType()).isEqualTo(PenaltyType.HP_RECOVER);
            // 400 + 60 (600 * 0.1) = 460
            assertThat(res.monsterRemainingHp()).isEqualTo(460);
        }

        @Test
        @DisplayName("HP_RECOVER — maxHp 초과 방지")
        void hpRecover_cappedAtMaxHp() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            // 몬스터 HP가 거의 풀
            ReflectionTestUtils.setField(session, "monsterRemainingHp", 580);

            BattleExit exit = createExit(1L, LocalDateTime.now().minusSeconds(45));

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            given(battleExitRepository.findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(1L))
                    .willReturn(Optional.of(exit));
            stubSaveExit();
            stubSaveSession();

            ReturnResponse res = battleService.recordReturn(1L, 1L);

            // 580 + 60 = 640 → capped at 600
            assertThat(res.monsterRemainingHp()).isEqualTo(600);
        }

        @Test
        @DisplayName("61~120초 이탈 → HP_DAMAGE, 몬스터 HP 20% 회복")
        void between61and120_hpDamage_20percent() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "monsterRemainingHp", 300);
            BattleExit exit = createExit(1L, LocalDateTime.now().minusSeconds(90));

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            given(battleExitRepository.findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(1L))
                    .willReturn(Optional.of(exit));
            stubSaveExit();
            stubSaveSession();

            ReturnResponse res = battleService.recordReturn(1L, 1L);

            assertThat(res.penaltyType()).isEqualTo(PenaltyType.HP_DAMAGE);
            // 300 + 120 (600 * 0.2) = 420
            assertThat(res.monsterRemainingHp()).isEqualTo(420);
        }

        @Test
        @DisplayName("121~300초 이탈 → HP_DAMAGE, 몬스터 HP 50% 회복")
        void between121and300_hpDamage_50percent() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "monsterRemainingHp", 200);
            BattleExit exit = createExit(1L, LocalDateTime.now().minusSeconds(200));

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            given(battleExitRepository.findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(1L))
                    .willReturn(Optional.of(exit));
            stubSaveExit();
            stubSaveSession();

            ReturnResponse res = battleService.recordReturn(1L, 1L);

            assertThat(res.penaltyType()).isEqualTo(PenaltyType.HP_DAMAGE);
            // 200 + 300 (600 * 0.5) = 500
            assertThat(res.monsterRemainingHp()).isEqualTo(500);
        }

        @Test
        @DisplayName(">300초 이탈 → DEFEAT 자동 패배")
        void over300_autoDefeat() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            BattleExit exit = createExit(1L, LocalDateTime.now().minusSeconds(350));

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            given(battleExitRepository.findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(1L))
                    .willReturn(Optional.of(exit));
            stubSaveExit();
            stubSaveSession();

            ReturnResponse res = battleService.recordReturn(1L, 1L);

            assertThat(res.penaltyType()).isEqualTo(PenaltyType.DEFEAT);
            assertThat(res.remainingTimeSec()).isEqualTo(0);
            assertThat(session.getResult()).isEqualTo(BattleResult.DEFEAT);
            assertThat(session.getEndedAt()).isNotNull();
        }

        @Test
        @DisplayName("totalExitSec 누적 확인")
        void totalExitSec_accumulates() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "totalExitSec", 30); // 기존 30초

            BattleExit exit = createExit(1L, LocalDateTime.now().minusSeconds(10));

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            given(battleExitRepository.findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(1L))
                    .willReturn(Optional.of(exit));
            stubSaveExit();
            stubSaveSession();

            battleService.recordReturn(1L, 1L);

            // 30 + ~10 = ~40
            assertThat(session.getTotalExitSec()).isBetween(39, 42);
        }

        @Test
        @DisplayName("이탈 기록 없음 — EntityNotFoundException")
        void noExit_throws() {
            BattleSession session = createSession(1L, 25, "오크", 600);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            given(battleExitRepository.findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(1L))
                    .willReturn(Optional.empty());

            assertThatThrownBy(() -> battleService.recordReturn(1L, 1L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("이탈 기록을 찾을 수 없습니다.");
        }
    }

    // ──────────────────────────────────────────────
    // endBattle
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("endBattle")
    class EndBattle {

        @Test
        @DisplayName("VICTORY — 기본 보상 계산 (콤보 0, 이탈 있음)")
        void victory_basicReward() {
            // given — plannedMin=25, exitCount=1
            BattleSession session = createSession(1L, 25, "오크", 600);
            session.incrementExitCount();
            // startedAt을 10분 전으로 설정
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(10));

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            // when
            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            // then
            // baseExp = 25 * 2 = 50
            // comboBonus = 0 (combo=0), perfectBonus = 0 (exitCount=1)
            // expEarned = 50 * (1 + 0 + 0) = 50
            // goldEarned = 50 / 2 = 25
            assertThat(res.result()).isEqualTo(BattleResult.VICTORY);
            assertThat(res.expEarned()).isEqualTo(50);
            assertThat(res.goldEarned()).isEqualTo(25);
            assertThat(res.perfectFocus()).isFalse();
            assertThat(res.maxCombo()).isEqualTo(0);

            // 경험치/골드는 BattleCompletedEvent를 통해 CharacterEventListener에서 처리
            verify(characterService, never()).addExp(anyLong(), anyInt(), any());
            verify(characterService, never()).addGold(anyLong(), anyInt());
        }

        @Test
        @DisplayName("VICTORY 퍼펙트 포커스 — exitCount=0, perfectBonus 50%")
        void victory_perfectFocus() {
            BattleSession session = createSession(1L, 30, "오크", 600);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(30));

            var req = new EndBattleRequest(BattleResult.VICTORY, 3);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            // baseExp = 30 * 2 = 60
            // actualMin = 30, maxAllowed = 30/5 = 6, validated = min(3,6) = 3
            // comboBonus = 0.3 (3이상), perfectBonus = 0.5 (exitCount=0)
            // expEarned = 60 * (1 + 0.3 + 0.5) = 60 * 1.8 = 108
            // goldEarned = 60 / 2 = 30
            assertThat(res.expEarned()).isEqualTo(108);
            assertThat(res.goldEarned()).isEqualTo(30);
            assertThat(res.perfectFocus()).isTrue();
            assertThat(res.maxCombo()).isEqualTo(3);
        }

        @Test
        @DisplayName("VICTORY 최대 콤보 보너스 — combo>=5, 50%")
        void victory_maxComboBonus() {
            BattleSession session = createSession(1L, 60, "마왕", 2400);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(60));

            var req = new EndBattleRequest(BattleResult.VICTORY, 10);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            // baseExp = 60 * 2 = 120
            // actualMin = 60, maxAllowed = 60/5 = 12, validated = min(10,12) = 10
            // comboBonus = 0.5 (>=5), perfectBonus = 0.5 (exitCount=0)
            // expEarned = 120 * (1 + 0.5 + 0.5) = 120 * 2.0 = 240
            assertThat(res.expEarned()).isEqualTo(240);
            assertThat(res.maxCombo()).isEqualTo(10);
        }

        @Test
        @DisplayName("VICTORY maxCombo 서버 검증 — actualMin/5 이하로 클램핑")
        void victory_comboClamped() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            // actualMin ≈ 5분
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(5));

            var req = new EndBattleRequest(BattleResult.VICTORY, 99); // 부풀린 콤보

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            // actualMin=5, maxAllowed = 5/5 = 1, validated = min(99,1) = 1
            assertThat(res.maxCombo()).isEqualTo(1);
        }

        @Test
        @DisplayName("DEFEAT — 30% 경험치, 골드 0")
        void defeat_partialReward() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(10));

            var req = new EndBattleRequest(BattleResult.DEFEAT, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));

            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            // baseExp = 25 * 2 = 50, 50 * 0.3 = 15
            assertThat(res.result()).isEqualTo(BattleResult.DEFEAT);
            assertThat(res.expEarned()).isEqualTo(15);
            assertThat(res.goldEarned()).isEqualTo(0);

            // 경험치/골드는 이벤트 리스너에서 처리
            verify(characterService, never()).addExp(anyLong(), anyInt(), any());
            verify(characterService, never()).addGold(anyLong(), anyInt());
            // DEFEAT에서는 아이템 드롭 시도 안 함
            verify(characterService, never()).dropItem(anyLong(), anyString());
            // DEFEAT에서는 스트릭 갱신 안 함
            verify(streakRepository, never()).findByUserIdAndStreakType(any(), any());
        }

        @Test
        @DisplayName("ABANDON — 보상 0")
        void abandon_noReward() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(3));

            var req = new EndBattleRequest(BattleResult.ABANDON, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));

            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            assertThat(res.result()).isEqualTo(BattleResult.ABANDON);
            assertThat(res.expEarned()).isEqualTo(0);
            assertThat(res.goldEarned()).isEqualTo(0);

            // ABANDON: 아이템 드롭 없음
            verify(characterService, never()).dropItem(anyLong(), anyString());
        }

        @Test
        @DisplayName("레벨업 감지 — 이전 레벨 < 이후 레벨이면 levelUp 반환")
        void levelUp_detected() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(10));

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            // 첫 호출: 레벨 5, 두 번째 호출: 레벨 6 (레벨업)
            given(characterService.getCharacter(1L))
                    .willReturn(mockCharResponse(5))
                    .willReturn(mockCharResponse(6));
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            assertThat(res.levelUp()).isEqualTo(6);
        }

        @Test
        @DisplayName("레벨업 없음 — levelUp null")
        void noLevelUp_null() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(10));

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5)); // 변화 없음
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            assertThat(res.levelUp()).isNull();
        }

        @Test
        @DisplayName("VICTORY 아이템 드롭 성공 — itemDrop 포함")
        void victory_itemDrop() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(10));

            var itemResponse = new ItemResponse(
                    5L, "화염의 검", "설명", ItemSlot.WEAPON, ItemRarity.RARE, Map.of(), null);
            var droppedItem = new UserItemResponse(1L, itemResponse, LocalDateTime.now(), "BATTLE_DROP");

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));
            given(characterService.dropItem(eq(1L), eq("C"))).willReturn(droppedItem); // 25분 → C
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            EndBattleResponse res = battleService.endBattle(1L, 1L, req);

            assertThat(res.itemDrop()).isNotNull();
            assertThat(res.itemDrop().item().name()).isEqualTo("화염의 검");
        }

        @Test
        @DisplayName("VICTORY — BattleCompletedEvent 발행")
        void victory_publishesEvent() {
            BattleSession session = createSessionWithQuest(1L, 25, 10L, 20L);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(10));

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));
            given(questRepository.findById(10L)).willReturn(Optional.of(createQuest(Grade.C)));
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            battleService.endBattle(1L, 1L, req);

            ArgumentCaptor<BattleCompletedEvent> captor = ArgumentCaptor.forClass(BattleCompletedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());

            BattleCompletedEvent event = captor.getValue();
            assertThat(event.getUserId()).isEqualTo(1L);
            assertThat(event.getSessionId()).isEqualTo(1L);
            assertThat(event.getResult()).isEqualTo(BattleResult.VICTORY);
            assertThat(event.getCheckpointId()).isEqualTo(20L);
            assertThat(event.getQuestId()).isEqualTo(10L);
        }

        @Test
        @DisplayName("VICTORY — BATTLE 스트릭 갱신 + StreakUpdatedEvent 발행")
        void victory_updatesStreak() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(10));

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.of(Streak.builder().userId(1L).streakType(StreakType.BATTLE).build()));

            battleService.endBattle(1L, 1L, req);

            verify(streakRepository).save(any(Streak.class));

            // BattleCompletedEvent + StreakUpdatedEvent 각각 발행 확인
            verify(eventPublisher).publishEvent(any(BattleCompletedEvent.class));
            verify(eventPublisher).publishEvent(any(StreakUpdatedEvent.class));
        }

        @Test
        @DisplayName("VICTORY 스트릭 없으면 새로 생성")
        void victory_createsNewStreak() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            ReflectionTestUtils.setField(session, "startedAt", LocalDateTime.now().minusMinutes(10));

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));
            stubSaveSession();
            given(characterService.getCharacter(1L)).willReturn(mockCharResponse(5));
            given(characterService.dropItem(eq(1L), anyString())).willReturn(null);
            // 스트릭 없음 → 새로 생성
            given(streakRepository.findByUserIdAndStreakType(1L, StreakType.BATTLE))
                    .willReturn(Optional.empty());
            given(streakRepository.save(any(Streak.class)))
                    .willAnswer(inv -> inv.getArgument(0));

            battleService.endBattle(1L, 1L, req);

            // save가 2번 호출: 1번 생성 + 1번 recordToday 후 갱신
            verify(streakRepository, times(2)).save(any(Streak.class));
        }

        @Test
        @DisplayName("이미 종료된 전투 — IllegalArgumentException")
        void alreadyEnded_throws() {
            BattleSession session = createSession(1L, 25, "오크", 600);
            session.autoDefeat();

            given(battleSessionRepository.findByIdAndUserId(1L, 1L)).willReturn(Optional.of(session));

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            assertThatThrownBy(() -> battleService.endBattle(1L, 1L, req))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("이미 종료된 전투");
        }

        @Test
        @DisplayName("세션 없음 — EntityNotFoundException")
        void sessionNotFound_throws() {
            given(battleSessionRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

            var req = new EndBattleRequest(BattleResult.VICTORY, 0);

            assertThatThrownBy(() -> battleService.endBattle(1L, 99L, req))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("전투 세션을 찾을 수 없습니다.");
        }
    }

    // ──────────────────────────────────────────────
    // getBattleHistory
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("getBattleHistory")
    class GetBattleHistory {

        @Test
        @DisplayName("정상 — 퀘스트 제목 포함 기록 반환")
        void success_withQuestTitle() {
            // given
            BattleSession session = createSessionWithQuest(1L, 25, 10L, null);
            session.endBattle(BattleResult.VICTORY, 20, 3, 50, 25, null);

            Quest quest = createQuest(Grade.C);

            given(battleSessionRepository.findAllByUserIdAndStartedAtBetween(
                    eq(1L), any(LocalDateTime.class), any(LocalDateTime.class)))
                    .willReturn(List.of(session));
            given(questRepository.findAllById(List.of(10L))).willReturn(List.of(quest));

            // when
            List<BattleHistoryResponse> history = battleService.getBattleHistory(
                    1L, LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 8));

            // then
            assertThat(history).hasSize(1);
            assertThat(history.get(0).questTitle()).isEqualTo("퀘스트");
            assertThat(history.get(0).result()).isEqualTo(BattleResult.VICTORY);
            assertThat(history.get(0).expEarned()).isEqualTo(50);
        }

        @Test
        @DisplayName("퀘스트 미연결 — questTitle null")
        void noQuest_nullTitle() {
            BattleSession session = createSession(1L, 10, "슬라임", 100);
            session.endBattle(BattleResult.DEFEAT, 5, 0, 6, 0, null);

            given(battleSessionRepository.findAllByUserIdAndStartedAtBetween(
                    eq(1L), any(LocalDateTime.class), any(LocalDateTime.class)))
                    .willReturn(List.of(session));

            List<BattleHistoryResponse> history = battleService.getBattleHistory(
                    1L, LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 8));

            assertThat(history).hasSize(1);
            assertThat(history.get(0).questTitle()).isNull();
        }

        @Test
        @DisplayName("기록 없음 — 빈 목록")
        void empty() {
            given(battleSessionRepository.findAllByUserIdAndStartedAtBetween(
                    eq(1L), any(LocalDateTime.class), any(LocalDateTime.class)))
                    .willReturn(List.of());

            List<BattleHistoryResponse> history = battleService.getBattleHistory(
                    1L, LocalDate.of(2026, 4, 1), LocalDate.of(2026, 4, 8));

            assertThat(history).isEmpty();
        }
    }
}
