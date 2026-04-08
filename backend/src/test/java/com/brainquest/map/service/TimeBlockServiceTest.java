package com.brainquest.map.service;

import com.brainquest.auth.entity.User;
import com.brainquest.auth.repository.UserRepository;
import com.brainquest.battle.entity.BattleResult;
import com.brainquest.battle.entity.BattleSession;
import com.brainquest.battle.repository.BattleSessionRepository;
import com.brainquest.common.exception.DuplicateResourceException;
import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.map.dto.*;
import com.brainquest.map.entity.*;
import com.brainquest.map.repository.TimeBlockRepository;
import com.brainquest.quest.entity.Grade;
import com.brainquest.quest.entity.Quest;
import com.brainquest.quest.entity.QuestCategory;
import com.brainquest.quest.repository.QuestRepository;
import com.brainquest.sky.repository.EmotionRecordRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("TimeBlockService \ub2e8\uc704 \ud14c\uc2a4\ud2b8")
class TimeBlockServiceTest {

    @InjectMocks
    private TimeBlockService timeBlockService;

    @Mock
    private TimeBlockRepository timeBlockRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private QuestRepository questRepository;

    @Mock
    private BattleSessionRepository battleSessionRepository;

    @Mock
    private EmotionRecordRepository emotionRecordRepository;

    // ── 헬퍼 메서드 ──

    private TimeBlock createBlock(Long userId, LocalDate date, LocalTime start, LocalTime end,
                                  BlockCategory category, String title) {
        return TimeBlock.builder()
                .userId(userId)
                .blockDate(date)
                .startTime(start)
                .endTime(end)
                .category(category)
                .title(title)
                .build();
    }

    private TimeBlock createBlockWithId(Long id, Long userId, LocalDate date,
                                        LocalTime start, LocalTime end) {
        TimeBlock block = createBlock(userId, date, start, end, BlockCategory.WORK, "업무 블록");
        ReflectionTestUtils.setField(block, "id", id);
        return block;
    }

    private User createUser(Long id, LocalTime sleepTime) {
        User user = User.builder()
                .email("test@test.com")
                .nickname("테스터")
                .provider("KAKAO")
                .providerId("kakao_123")
                .sleepTime(sleepTime)
                .build();
        ReflectionTestUtils.setField(user, "id", id);
        return user;
    }

    private BattleSession createBattleSession(Long id, Long userId, String monsterType,
                                               BattleResult result, int plannedMin) {
        BattleSession session = BattleSession.builder()
                .userId(userId)
                .plannedMin(plannedMin)
                .monsterType(monsterType)
                .monsterMaxHp(600)
                .build();
        ReflectionTestUtils.setField(session, "id", id);
        if (result != null) {
            session.endBattle(result, plannedMin, 3, 50, 30, null);
        }
        return session;
    }

    // ──────────────────────────────────────────────
    // createBlock
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("createBlock")
    class CreateBlock {

        @Test
        @DisplayName("정상 — 타임블록 생성")
        void success() {
            // given
            Long userId = 1L;
            LocalDate date = LocalDate.of(2026, 4, 8);
            var req = new CreateBlockRequest(
                    date, LocalTime.of(9, 0), LocalTime.of(10, 0),
                    BlockCategory.WORK, "회의", null);

            given(timeBlockRepository.findOverlapping(userId, date,
                    LocalTime.of(9, 0), LocalTime.of(10, 0)))
                    .willReturn(List.of());

            given(timeBlockRepository.save(any(TimeBlock.class))).willAnswer(inv -> {
                TimeBlock b = inv.getArgument(0);
                ReflectionTestUtils.setField(b, "id", 1L);
                return b;
            });

            // when
            BlockResponse res = timeBlockService.createBlock(userId, req);

            // then
            assertThat(res.id()).isEqualTo(1L);
            assertThat(res.blockDate()).isEqualTo(date);
            assertThat(res.startTime()).isEqualTo(LocalTime.of(9, 0));
            assertThat(res.endTime()).isEqualTo(LocalTime.of(10, 0));
            assertThat(res.category()).isEqualTo(BlockCategory.WORK);
            assertThat(res.title()).isEqualTo("회의");
            assertThat(res.status()).isEqualTo(BlockStatus.PLANNED);
            assertThat(res.source()).isEqualTo(BlockSource.MANUAL);

            verify(timeBlockRepository).save(any(TimeBlock.class));
        }

        @Test
        @DisplayName("정상 — 퀘스트 연결 블록 생성")
        void successWithQuestId() {
            // given
            Long userId = 1L;
            LocalDate date = LocalDate.of(2026, 4, 8);
            var req = new CreateBlockRequest(
                    date, LocalTime.of(14, 0), LocalTime.of(15, 0),
                    BlockCategory.WORK, "퀘스트 작업", 10L);

            given(timeBlockRepository.findOverlapping(userId, date,
                    LocalTime.of(14, 0), LocalTime.of(15, 0)))
                    .willReturn(List.of());

            given(timeBlockRepository.save(any(TimeBlock.class))).willAnswer(inv -> {
                TimeBlock b = inv.getArgument(0);
                ReflectionTestUtils.setField(b, "id", 2L);
                return b;
            });

            // when
            BlockResponse res = timeBlockService.createBlock(userId, req);

            // then
            assertThat(res.questId()).isEqualTo(10L);

            ArgumentCaptor<TimeBlock> captor = ArgumentCaptor.forClass(TimeBlock.class);
            verify(timeBlockRepository).save(captor.capture());
            assertThat(captor.getValue().getQuestId()).isEqualTo(10L);
        }

        @Test
        @DisplayName("시간 겹침 — DuplicateResourceException")
        void timeOverlap() {
            // given
            Long userId = 1L;
            LocalDate date = LocalDate.of(2026, 4, 8);
            var req = new CreateBlockRequest(
                    date, LocalTime.of(9, 0), LocalTime.of(10, 0),
                    BlockCategory.WORK, "회의", null);

            TimeBlock existing = createBlockWithId(5L, userId, date,
                    LocalTime.of(9, 30), LocalTime.of(10, 30));
            given(timeBlockRepository.findOverlapping(userId, date,
                    LocalTime.of(9, 0), LocalTime.of(10, 0)))
                    .willReturn(List.of(existing));

            // when & then
            assertThatThrownBy(() -> timeBlockService.createBlock(userId, req))
                    .isInstanceOf(DuplicateResourceException.class)
                    .hasMessageContaining("이미 블록이 존재합니다");

            verify(timeBlockRepository, never()).save(any());
        }
    }

    // ──────��───────────────────────────────���───────
    // updateBlock
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("updateBlock")
    class UpdateBlock {

        @Test
        @DisplayName("정상 — 제목, 카테고리, 상태 변경")
        void success() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlockWithId(1L, userId, LocalDate.of(2026, 4, 8),
                    LocalTime.of(9, 0), LocalTime.of(10, 0));

            given(timeBlockRepository.findByIdAndUserId(1L, userId)).willReturn(Optional.of(block));
            given(timeBlockRepository.save(any(TimeBlock.class))).willAnswer(inv -> inv.getArgument(0));

            var req = new UpdateBlockRequest(null, null, BlockCategory.HEALTH, "운동", BlockStatus.IN_PROGRESS);

            // when
            BlockResponse res = timeBlockService.updateBlock(userId, 1L, req);

            // then
            assertThat(res.category()).isEqualTo(BlockCategory.HEALTH);
            assertThat(res.title()).isEqualTo("운동");
            assertThat(res.status()).isEqualTo(BlockStatus.IN_PROGRESS);
            // 시간은 변경하지 않았으므로 그대로
            assertThat(res.startTime()).isEqualTo(LocalTime.of(9, 0));
            assertThat(res.endTime()).isEqualTo(LocalTime.of(10, 0));
        }

        @Test
        @DisplayName("정상 — 시간 변경 (겹침 없음)")
        void successTimeChange() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlockWithId(1L, userId, LocalDate.of(2026, 4, 8),
                    LocalTime.of(9, 0), LocalTime.of(10, 0));

            given(timeBlockRepository.findByIdAndUserId(1L, userId)).willReturn(Optional.of(block));
            given(timeBlockRepository.findOverlappingExcluding(userId,
                    LocalDate.of(2026, 4, 8), LocalTime.of(10, 0), LocalTime.of(11, 0), 1L))
                    .willReturn(List.of());
            given(timeBlockRepository.save(any(TimeBlock.class))).willAnswer(inv -> inv.getArgument(0));

            var req = new UpdateBlockRequest(LocalTime.of(10, 0), LocalTime.of(11, 0), null, null, null);

            // when
            BlockResponse res = timeBlockService.updateBlock(userId, 1L, req);

            // then
            assertThat(res.startTime()).isEqualTo(LocalTime.of(10, 0));
            assertThat(res.endTime()).isEqualTo(LocalTime.of(11, 0));
            verify(timeBlockRepository).findOverlappingExcluding(any(), any(), any(), any(), eq(1L));
        }

        @Test
        @DisplayName("시간 변경 시 겹침 — DuplicateResourceException")
        void timeOverlapOnUpdate() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlockWithId(1L, userId, LocalDate.of(2026, 4, 8),
                    LocalTime.of(9, 0), LocalTime.of(10, 0));
            TimeBlock other = createBlockWithId(2L, userId, LocalDate.of(2026, 4, 8),
                    LocalTime.of(10, 0), LocalTime.of(11, 0));

            given(timeBlockRepository.findByIdAndUserId(1L, userId)).willReturn(Optional.of(block));
            given(timeBlockRepository.findOverlappingExcluding(userId,
                    LocalDate.of(2026, 4, 8), LocalTime.of(9, 30), LocalTime.of(10, 30), 1L))
                    .willReturn(List.of(other));

            var req = new UpdateBlockRequest(LocalTime.of(9, 30), LocalTime.of(10, 30), null, null, null);

            // when & then
            assertThatThrownBy(() -> timeBlockService.updateBlock(userId, 1L, req))
                    .isInstanceOf(DuplicateResourceException.class);

            verify(timeBlockRepository, never()).save(any());
        }

        @Test
        @DisplayName("블록 없음 — EntityNotFoundException")
        void notFound() {
            given(timeBlockRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

            var req = new UpdateBlockRequest(null, null, null, "제목", null);

            assertThatThrownBy(() -> timeBlockService.updateBlock(1L, 99L, req))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("\ud0c0\uc784\ube14\ub85d\uc744 \ucc3e\uc744 \uc218 \uc5c6\uc2b5\ub2c8\ub2e4");
        }
    }

    // ───────────────────────────��──────────────────
    // deleteBlock
    // ──────────────────────────────────────���───────

    @Nested
    @DisplayName("deleteBlock")
    class DeleteBlock {

        @Test
        @DisplayName("정상 — 타임블록 삭제")
        void success() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlockWithId(1L, userId, LocalDate.of(2026, 4, 8),
                    LocalTime.of(9, 0), LocalTime.of(10, 0));

            given(timeBlockRepository.findByIdAndUserId(1L, userId)).willReturn(Optional.of(block));

            // when
            timeBlockService.deleteBlock(userId, 1L);

            // then
            verify(timeBlockRepository).delete(block);
        }

        @Test
        @DisplayName("블록 없음 — EntityNotFoundException")
        void notFound() {
            given(timeBlockRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> timeBlockService.deleteBlock(1L, 99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("타임블록을 찾을 수 없습니다");

            verify(timeBlockRepository, never()).delete(any());
        }
    }

    // ──────────��───────────────────────────────────
    // getTimeline
    // ───────────────��──────────────────────────────

    @Nested
    @DisplayName("getTimeline")
    class GetTimeline {

        @Test
        @DisplayName("정상 — 블록 + 퀘스트 요약 + 전투 세션 통합 조회")
        void success() {
            // given
            Long userId = 1L;
            LocalDate date = LocalDate.of(2026, 4, 8);

            TimeBlock block1 = createBlockWithId(1L, userId, date,
                    LocalTime.of(9, 0), LocalTime.of(10, 0));
            ReflectionTestUtils.setField(block1, "questId", 10L);

            TimeBlock block2 = createBlockWithId(2L, userId, date,
                    LocalTime.of(10, 0), LocalTime.of(11, 0));

            given(timeBlockRepository.findAllByUserIdAndBlockDateOrderByStartTime(userId, date))
                    .willReturn(List.of(block1, block2));

            // 퀘스트 (1개 완료)
            Quest quest = Quest.builder()
                    .userId(userId).originalTitle("할 일").questTitle("퀘스트")
                    .questStory("스토리").category(QuestCategory.WORK).grade(Grade.D)
                    .estimatedMin(30).expReward(25).goldReward(15).build();
            ReflectionTestUtils.setField(quest, "id", 10L);
            quest.complete();
            given(questRepository.findAllById(List.of(10L))).willReturn(List.of(quest));

            // 전투 세션
            BattleSession battle = createBattleSession(100L, userId, "슬라임", BattleResult.VICTORY, 25);
            LocalDateTime dayStart = date.atStartOfDay();
            LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();
            given(battleSessionRepository.findAllByUserIdAndStartedAtBetween(userId, dayStart, dayEnd))
                    .willReturn(List.of(battle));

            // User (남은 시간)
            User user = createUser(userId, LocalTime.of(23, 0));
            given(userRepository.findById(userId)).willReturn(Optional.of(user));

            // when
            TimelineResponse res = timeBlockService.getTimeline(userId, date);

            // then
            assertThat(res.blocks()).hasSize(2);
            assertThat(res.blocks().get(0).questId()).isEqualTo(10L);
            assertThat(res.blocks().get(1).questId()).isNull();

            assertThat(res.questSummary().total()).isEqualTo(1);
            assertThat(res.questSummary().completed()).isEqualTo(1);

            assertThat(res.battleSessions()).hasSize(1);
            assertThat(res.battleSessions().get(0).monsterType()).isEqualTo("슬라임");
            assertThat(res.battleSessions().get(0).result()).isEqualTo("VICTORY");

            assertThat(res.remainingMin()).isGreaterThanOrEqualTo(0);
            assertThat(res.emotionRecords()).isEmpty();
        }

        @Test
        @DisplayName("빈 날짜 — 블록/퀘스트/전투 모두 없음")
        void emptyDay() {
            // given
            Long userId = 1L;
            LocalDate date = LocalDate.of(2026, 4, 8);

            given(timeBlockRepository.findAllByUserIdAndBlockDateOrderByStartTime(userId, date))
                    .willReturn(List.of());
            given(battleSessionRepository.findAllByUserIdAndStartedAtBetween(
                    eq(userId), any(), any()))
                    .willReturn(List.of());

            User user = createUser(userId, LocalTime.of(23, 0));
            given(userRepository.findById(userId)).willReturn(Optional.of(user));

            // when
            TimelineResponse res = timeBlockService.getTimeline(userId, date);

            // then
            assertThat(res.blocks()).isEmpty();
            assertThat(res.questSummary().total()).isEqualTo(0);
            assertThat(res.questSummary().completed()).isEqualTo(0);
            assertThat(res.battleSessions()).isEmpty();
            assertThat(res.emotionRecords()).isEmpty();

            verify(questRepository, never()).findAllById(any());
        }

        @Test
        @DisplayName("퀘스트 연결 블록 여러 개 — 중복 퀘스트 ID 집계")
        void multipleBlocksSameQuest() {
            // given
            Long userId = 1L;
            LocalDate date = LocalDate.of(2026, 4, 8);

            TimeBlock block1 = createBlockWithId(1L, userId, date,
                    LocalTime.of(9, 0), LocalTime.of(10, 0));
            ReflectionTestUtils.setField(block1, "questId", 10L);

            TimeBlock block2 = createBlockWithId(2L, userId, date,
                    LocalTime.of(10, 0), LocalTime.of(11, 0));
            ReflectionTestUtils.setField(block2, "questId", 10L); // 같은 퀘스트

            given(timeBlockRepository.findAllByUserIdAndBlockDateOrderByStartTime(userId, date))
                    .willReturn(List.of(block1, block2));

            Quest quest = Quest.builder()
                    .userId(userId).originalTitle("할 일").questTitle("퀘스트")
                    .questStory("스토리").category(QuestCategory.WORK).grade(Grade.D)
                    .estimatedMin(30).expReward(25).goldReward(15).build();
            ReflectionTestUtils.setField(quest, "id", 10L);
            given(questRepository.findAllById(List.of(10L))).willReturn(List.of(quest));

            given(battleSessionRepository.findAllByUserIdAndStartedAtBetween(
                    eq(userId), any(), any())).willReturn(List.of());

            User user = createUser(userId, LocalTime.of(23, 0));
            given(userRepository.findById(userId)).willReturn(Optional.of(user));

            // when
            TimelineResponse res = timeBlockService.getTimeline(userId, date);

            // then — 같은 퀘스트 2개 블록이지만 퀘스트 1개로 집계
            assertThat(res.questSummary().total()).isEqualTo(1);
            assertThat(res.questSummary().completed()).isEqualTo(0);
        }
    }

    // ───────────────────��──────────────────────────
    // completeBlock
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("completeBlock")
    class CompleteBlock {

        @Test
        @DisplayName("정상 — 블록 완료 처리")
        void success() {
            // given
            Long userId = 1L;
            TimeBlock block = createBlockWithId(1L, userId, LocalDate.of(2026, 4, 8),
                    LocalTime.of(9, 0), LocalTime.of(10, 0));

            given(timeBlockRepository.findByIdAndUserId(1L, userId)).willReturn(Optional.of(block));
            given(timeBlockRepository.save(any(TimeBlock.class))).willAnswer(inv -> inv.getArgument(0));

            // when
            BlockResponse res = timeBlockService.completeBlock(userId, 1L);

            // then
            assertThat(res.status()).isEqualTo(BlockStatus.COMPLETED);
            assertThat(block.getActualEnd()).isNotNull();

            verify(timeBlockRepository).save(block);
        }

        @Test
        @DisplayName("블록 없음 — EntityNotFoundException")
        void notFound() {
            given(timeBlockRepository.findByIdAndUserId(99L, 1L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> timeBlockService.completeBlock(1L, 99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("타임블록을 찾을 수 없습니다");
        }
    }

    // ────────���──────────────────────��──────────────
    // getRemainingTime
    // ──────────────────────────────────────────���───

    @Nested
    @DisplayName("getRemainingTime")
    class GetRemainingTime {

        @Test
        @DisplayName("정상 — 남은 시간과 취침 시간 반환")
        void success() {
            // given
            Long userId = 1L;
            LocalTime sleepTime = LocalTime.of(23, 0);
            User user = createUser(userId, sleepTime);

            given(userRepository.findById(userId)).willReturn(Optional.of(user));

            // when
            RemainingTimeResponse res = timeBlockService.getRemainingTime(userId);

            // then
            assertThat(res.sleepTime()).isEqualTo(sleepTime);
            assertThat(res.remainingMin()).isGreaterThanOrEqualTo(0);
        }

        @Test
        @DisplayName("사용자 없음 — EntityNotFoundException")
        void userNotFound() {
            given(userRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> timeBlockService.getRemainingTime(99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("사용자를 찾을 수 없습니다");
        }
    }
}
