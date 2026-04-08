package com.brainquest.quest.service;

import com.brainquest.character.dto.UserItemResponse;
import com.brainquest.character.entity.StatType;
import com.brainquest.character.service.CharacterService;
import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.event.events.CheckpointCompletedEvent;
import com.brainquest.event.events.QuestCompletedEvent;
import com.brainquest.quest.ai.ClaudeApiClient;
import com.brainquest.quest.ai.ClaudeApiClient.QuestGenerationResult;
import com.brainquest.quest.dto.*;
import com.brainquest.quest.entity.*;
import com.brainquest.quest.repository.CheckpointRepository;
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

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("QuestService 단위 테스트")
class QuestServiceTest {

    @InjectMocks
    private QuestService questService;

    @Mock
    private QuestRepository questRepository;

    @Mock
    private CheckpointRepository checkpointRepository;

    @Mock
    private ClaudeApiClient claudeApiClient;

    @Mock
    private CharacterService characterService;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    // ── 헬퍼 메서드 ──

    private Quest createQuest(Long userId, Grade grade, int expReward, int goldReward) {
        return Quest.builder()
                .userId(userId)
                .originalTitle("빨래하기")
                .questTitle("세탁의 마법사 퀘스트")
                .questStory("어둠의 세탁물이 쌓여간다...")
                .category(QuestCategory.HOME)
                .grade(grade)
                .estimatedMin(30)
                .expReward(expReward)
                .goldReward(goldReward)
                .build();
    }

    private Checkpoint addCheckpoint(Quest quest, Long cpId, int order, int exp, int gold) {
        Checkpoint cp = Checkpoint.builder()
                .orderNum(order)
                .title("체크포인트 " + order)
                .estimatedMin(10)
                .expReward(exp)
                .goldReward(gold)
                .build();
        quest.addCheckpoint(cp);
        if (cpId != null) {
            ReflectionTestUtils.setField(cp, "id", cpId);
        }
        return cp;
    }

    private void setId(Object entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
    }

    // ──────────────────────────────────────────────
    // generateQuest
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("generateQuest")
    class GenerateQuest {

        @Test
        @DisplayName("정상 — Claude API 결과를 바탕으로 퀘스트 생성")
        void success() {
            // given
            Long userId = 1L;
            var req = new GenerateQuestRequest("빨래하기", 30, QuestCategory.HOME);
            var aiResult = new QuestGenerationResult(
                    "세탁의 마법사 퀘스트",
                    "어둠의 세탁물이 쌓여간다...",
                    List.of(
                            new QuestGenerationResult.CheckpointData("세탁기 돌리기", 10),
                            new QuestGenerationResult.CheckpointData("건조하기", 20)));

            given(claudeApiClient.generateQuestStory(userId, "빨래하기", 30, QuestCategory.HOME))
                    .willReturn(aiResult);

            // when
            GenerateQuestResponse res = questService.generateQuest(userId, req);

            // then
            assertThat(res.questTitle()).isEqualTo("세탁의 마법사 퀘스트");
            assertThat(res.questStory()).isEqualTo("어둠의 세탁물이 쌓여간다...");
            assertThat(res.originalTitle()).isEqualTo("빨래하기");
            assertThat(res.grade()).isEqualTo(Grade.D); // 30분 → D
            assertThat(res.expReward()).isEqualTo(25);
            assertThat(res.goldReward()).isEqualTo(15);
            assertThat(res.checkpoints()).hasSize(2);
        }

        @Test
        @DisplayName("등급 E — 10분 이하, exp=10, gold=5")
        void gradeE() {
            // given
            var req = new GenerateQuestRequest("물 마시기", 10, QuestCategory.HEALTH);
            var aiResult = new QuestGenerationResult("t", "s",
                    List.of(new QuestGenerationResult.CheckpointData("cp", 10)));
            given(claudeApiClient.generateQuestStory(any(), any(), eq(10), any())).willReturn(aiResult);

            // when
            GenerateQuestResponse res = questService.generateQuest(1L, req);

            // then
            assertThat(res.grade()).isEqualTo(Grade.E);
            assertThat(res.expReward()).isEqualTo(10);
            assertThat(res.goldReward()).isEqualTo(5);
        }

        @Test
        @DisplayName("등급 C — 60분 이하, exp=50, gold=30")
        void gradeC() {
            var req = new GenerateQuestRequest("청소하기", 60, QuestCategory.HOME);
            var aiResult = new QuestGenerationResult("t", "s",
                    List.of(new QuestGenerationResult.CheckpointData("cp", 60)));
            given(claudeApiClient.generateQuestStory(any(), any(), eq(60), any())).willReturn(aiResult);

            GenerateQuestResponse res = questService.generateQuest(1L, req);

            assertThat(res.grade()).isEqualTo(Grade.C);
            assertThat(res.expReward()).isEqualTo(50);
            assertThat(res.goldReward()).isEqualTo(30);
        }

        @Test
        @DisplayName("등급 B — 120분 이하, exp=100, gold=60")
        void gradeB() {
            var req = new GenerateQuestRequest("공부하기", 120, QuestCategory.WORK);
            var aiResult = new QuestGenerationResult("t", "s",
                    List.of(new QuestGenerationResult.CheckpointData("cp", 120)));
            given(claudeApiClient.generateQuestStory(any(), any(), eq(120), any())).willReturn(aiResult);

            GenerateQuestResponse res = questService.generateQuest(1L, req);

            assertThat(res.grade()).isEqualTo(Grade.B);
            assertThat(res.expReward()).isEqualTo(100);
            assertThat(res.goldReward()).isEqualTo(60);
        }

        @Test
        @DisplayName("등급 A — 120분 초과, exp=200, gold=120")
        void gradeA() {
            var req = new GenerateQuestRequest("프로젝트", 180, QuestCategory.WORK);
            var aiResult = new QuestGenerationResult("t", "s",
                    List.of(new QuestGenerationResult.CheckpointData("cp", 180)));
            given(claudeApiClient.generateQuestStory(any(), any(), eq(180), any())).willReturn(aiResult);

            GenerateQuestResponse res = questService.generateQuest(1L, req);

            assertThat(res.grade()).isEqualTo(Grade.A);
            assertThat(res.expReward()).isEqualTo(200);
            assertThat(res.goldReward()).isEqualTo(120);
        }

        @Test
        @DisplayName("체크포인트 보상 분배 — 마지막 +20% 보너스")
        void checkpointRewardDistribution() {
            // given: D등급(exp=25, gold=15), 체크포인트 2개
            var req = new GenerateQuestRequest("빨래", 30, QuestCategory.HOME);
            var aiResult = new QuestGenerationResult("t", "s",
                    List.of(
                            new QuestGenerationResult.CheckpointData("cp1", 10),
                            new QuestGenerationResult.CheckpointData("cp2", 20)));
            given(claudeApiClient.generateQuestStory(any(), any(), anyInt(), any())).willReturn(aiResult);

            // when
            GenerateQuestResponse res = questService.generateQuest(1L, req);

            // then — base exp=12, gold=7 / last exp=14, gold=8
            assertThat(res.checkpoints().get(0).expReward()).isEqualTo(12);
            assertThat(res.checkpoints().get(0).goldReward()).isEqualTo(7);
            assertThat(res.checkpoints().get(1).expReward()).isEqualTo(14);  // 12 * 1.2 = 14
            assertThat(res.checkpoints().get(1).goldReward()).isEqualTo(8);  // 7 * 1.2 = 8
        }
    }

    // ──────────────────────────────────────────────
    // saveQuest
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("saveQuest")
    class SaveQuest {

        @Test
        @DisplayName("정상 — Quest + Checkpoint 저장 후 QuestResponse 반환")
        void success() {
            // given
            Long userId = 1L;
            var req = new SaveQuestRequest(
                    "빨래하기", "세탁의 마법사", "스토리",
                    QuestCategory.HOME, Grade.D, 30, null,
                    List.of(
                            new CheckpointRequest("세탁기 돌리기", 10),
                            new CheckpointRequest("건조하기", 20)));

            given(questRepository.save(any(Quest.class))).willAnswer(inv -> {
                Quest q = inv.getArgument(0);
                setId(q, 1L);
                return q;
            });

            // when
            QuestResponse res = questService.saveQuest(userId, req);

            // then
            assertThat(res.id()).isEqualTo(1L);
            assertThat(res.questTitle()).isEqualTo("세탁의 마법사");
            assertThat(res.grade()).isEqualTo(Grade.D);
            assertThat(res.expReward()).isEqualTo(25);
            assertThat(res.goldReward()).isEqualTo(15);
            assertThat(res.totalCheckpoints()).isEqualTo(2);
            assertThat(res.completedCheckpoints()).isEqualTo(0);
            assertThat(res.status()).isEqualTo(QuestStatus.ACTIVE);

            // Quest가 Checkpoint 2개를 갖고 save 1회 호출됨
            ArgumentCaptor<Quest> captor = ArgumentCaptor.forClass(Quest.class);
            verify(questRepository).save(captor.capture());
            assertThat(captor.getValue().getCheckpoints()).hasSize(2);
        }

        @Test
        @DisplayName("체크포인트 보상이 등급 테이블에 맞게 계산됨")
        void rewardsMatchGradeTable() {
            // given — Grade A
            var req = new SaveQuestRequest(
                    "대작업", "대퀘스트", "스토리",
                    QuestCategory.WORK, Grade.A, 200, null,
                    List.of(new CheckpointRequest("작업", 200)));

            given(questRepository.save(any(Quest.class))).willAnswer(inv -> inv.getArgument(0));

            // when
            QuestResponse res = questService.saveQuest(1L, req);

            // then — A등급: exp=200, gold=120
            assertThat(res.expReward()).isEqualTo(200);
            assertThat(res.goldReward()).isEqualTo(120);
        }
    }

    // ──────────────────────────────────────────────
    // getActiveQuests
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("getActiveQuests")
    class GetActiveQuests {

        @Test
        @DisplayName("카테고리 없이 전체 활성 퀘스트 조회")
        void withoutCategory() {
            // given
            Long userId = 1L;
            Quest quest = createQuest(userId, Grade.D, 25, 15);
            setId(quest, 1L);
            addCheckpoint(quest, 10L, 1, 12, 7);
            Checkpoint cp2 = addCheckpoint(quest, 11L, 2, 13, 8);
            cp2.complete(); // 1개 완료

            given(questRepository.findAllByUserIdAndStatusWithCheckpoints(userId, QuestStatus.ACTIVE))
                    .willReturn(List.of(quest));

            // when
            List<QuestResponse> result = questService.getActiveQuests(userId, null);

            // then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).totalCheckpoints()).isEqualTo(2);
            assertThat(result.get(0).completedCheckpoints()).isEqualTo(1);
        }

        @Test
        @DisplayName("카테고리 필터 적용")
        void withCategory() {
            // given
            Long userId = 1L;
            given(questRepository.findAllByUserIdAndStatusAndCategoryWithCheckpoints(
                    userId, QuestStatus.ACTIVE, QuestCategory.WORK))
                    .willReturn(List.of());

            // when
            List<QuestResponse> result = questService.getActiveQuests(userId, QuestCategory.WORK);

            // then
            assertThat(result).isEmpty();
            verify(questRepository).findAllByUserIdAndStatusAndCategoryWithCheckpoints(
                    userId, QuestStatus.ACTIVE, QuestCategory.WORK);
            verify(questRepository, never()).findAllByUserIdAndStatusWithCheckpoints(any(), any());
        }

        @Test
        @DisplayName("퀘스트 없음 — 빈 목록")
        void emptyList() {
            given(questRepository.findAllByUserIdAndStatusWithCheckpoints(1L, QuestStatus.ACTIVE))
                    .willReturn(List.of());

            List<QuestResponse> result = questService.getActiveQuests(1L, null);

            assertThat(result).isEmpty();
        }
    }

    // ──────────────────────────────────────────────
    // getQuestDetail
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("getQuestDetail")
    class GetQuestDetail {

        @Test
        @DisplayName("정상 — 퀘스트 + 체크포인트 상세 반환")
        void success() {
            // given
            Quest quest = createQuest(1L, Grade.D, 25, 15);
            setId(quest, 1L);
            addCheckpoint(quest, 10L, 1, 12, 7);
            addCheckpoint(quest, 11L, 2, 13, 8);

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest));

            // when
            QuestDetailResponse res = questService.getQuestDetail(1L, 1L);

            // then
            assertThat(res.id()).isEqualTo(1L);
            assertThat(res.questTitle()).isEqualTo("세탁의 마법사 퀘스트");
            assertThat(res.questStory()).isEqualTo("어둠의 세탁물이 쌓여간다...");
            assertThat(res.checkpoints()).hasSize(2);
            assertThat(res.checkpoints().get(0).orderNum()).isEqualTo(1);
            assertThat(res.checkpoints().get(1).orderNum()).isEqualTo(2);
        }

        @Test
        @DisplayName("퀘스트 없음 — EntityNotFoundException")
        void notFound() {
            given(questRepository.findByIdWithCheckpoints(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> questService.getQuestDetail(1L, 99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("퀘스트를 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("다른 사용자의 퀘스트 — EntityNotFoundException")
        void otherUsersQuest_throwsException() {
            Quest quest = createQuest(2L, Grade.D, 25, 15);
            setId(quest, 1L);

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest));

            assertThatThrownBy(() -> questService.getQuestDetail(1L, 1L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("퀘스트를 찾을 수 없습니다.");
        }
    }

    // ──────────────────────────────────────────────
    // completeCheckpoint
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("completeCheckpoint")
    class CompleteCheckpoint {

        @Test
        @DisplayName("정상 — 체크포인트 1개 완료 (퀘스트 미완료)")
        void partialCompletion() {
            // given
            Quest quest = createQuest(1L, Grade.D, 25, 15);
            setId(quest, 1L);
            Checkpoint cp1 = addCheckpoint(quest, 10L, 1, 12, 7);
            addCheckpoint(quest, 11L, 2, 13, 8);

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest));
            given(checkpointRepository.findById(10L)).willReturn(Optional.of(cp1));

            // when
            CheckpointCompleteResponse res = questService.completeCheckpoint(1L, 1L, 10L);

            // then
            assertThat(res.questCompleted()).isFalse();
            assertThat(res.reward().exp()).isEqualTo(12);
            assertThat(res.reward().gold()).isEqualTo(7);
            assertThat(res.checkpoint().status()).isEqualTo(CheckpointStatus.COMPLETED);
            assertThat(res.itemDrop()).isNull();

            verify(checkpointRepository).save(cp1);
            verify(characterService).addExp(1L, 12, StatType.WIS);
            verify(characterService).addGold(1L, 7);
            verify(eventPublisher).publishEvent(any(CheckpointCompletedEvent.class));
            verify(eventPublisher, never()).publishEvent(any(QuestCompletedEvent.class));
            verify(questRepository, never()).save(any());
        }

        @Test
        @DisplayName("정상 — 마지막 체크포인트 완료 → 퀘스트 완료 + 잔여 보상 + 아이템 드롭")
        void fullCompletion() {
            // given — exp=25, gold=15, cp1(12,7) + cp2(12,7) → remaining exp=1, gold=1
            Quest quest = createQuest(1L, Grade.D, 25, 15);
            setId(quest, 1L);
            Checkpoint cp1 = addCheckpoint(quest, 10L, 1, 12, 7);
            cp1.complete(); // 이미 완료
            Checkpoint cp2 = addCheckpoint(quest, 11L, 2, 12, 7);

            var mockItemDrop = mock(UserItemResponse.class);

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest));
            given(checkpointRepository.findById(11L)).willReturn(Optional.of(cp2));
            given(characterService.dropItem(1L, "D")).willReturn(mockItemDrop);

            // when
            CheckpointCompleteResponse res = questService.completeCheckpoint(1L, 1L, 11L);

            // then
            assertThat(res.questCompleted()).isTrue();
            assertThat(res.reward().exp()).isEqualTo(12 + 1);  // cp + remaining
            assertThat(res.reward().gold()).isEqualTo(7 + 1);
            assertThat(res.itemDrop()).isEqualTo(mockItemDrop);

            // cp2 보상
            verify(characterService).addExp(1L, 12, StatType.WIS);
            verify(characterService).addGold(1L, 7);
            // 잔여 보상
            verify(characterService).addExp(1L, 1, StatType.WIS);
            verify(characterService).addGold(1L, 1);
            // 이벤트
            verify(eventPublisher).publishEvent(any(CheckpointCompletedEvent.class));
            verify(eventPublisher).publishEvent(any(QuestCompletedEvent.class));
            verify(questRepository).save(quest);
            assertThat(quest.getStatus()).isEqualTo(QuestStatus.COMPLETED);
            assertThat(quest.getCompletedAt()).isNotNull();
        }

        @Test
        @DisplayName("퀘스트 완료 이벤트에 올바른 값 전달")
        void questCompletedEvent_correctValues() {
            // given — 체크포인트 1개짜리 퀘스트 (바로 완료)
            Quest quest = createQuest(1L, Grade.C, 50, 30);
            setId(quest, 5L);
            Checkpoint cp = addCheckpoint(quest, 20L, 1, 50, 30);

            given(questRepository.findByIdWithCheckpoints(5L)).willReturn(Optional.of(quest));
            given(checkpointRepository.findById(20L)).willReturn(Optional.of(cp));

            // when
            questService.completeCheckpoint(1L, 5L, 20L);

            // then
            ArgumentCaptor<QuestCompletedEvent> captor = ArgumentCaptor.forClass(QuestCompletedEvent.class);
            verify(eventPublisher).publishEvent(captor.capture());

            QuestCompletedEvent event = captor.getValue();
            assertThat(event.getUserId()).isEqualTo(1L);
            assertThat(event.getQuestId()).isEqualTo(5L);
            assertThat(event.getGrade()).isEqualTo("C");
            assertThat(event.getExpReward()).isEqualTo(50);
            assertThat(event.getGoldReward()).isEqualTo(30);
        }

        @Test
        @DisplayName("잔여 보상 없음 — 체크포인트 합계 == 퀘스트 보상")
        void noRemainingReward() {
            // given — exp=25, gold=15, cp 합계 = 25, 15
            Quest quest = createQuest(1L, Grade.D, 25, 15);
            setId(quest, 1L);
            Checkpoint cp1 = addCheckpoint(quest, 10L, 1, 13, 8);
            cp1.complete();
            Checkpoint cp2 = addCheckpoint(quest, 11L, 2, 12, 7);

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest));
            given(checkpointRepository.findById(11L)).willReturn(Optional.of(cp2));

            // when
            CheckpointCompleteResponse res = questService.completeCheckpoint(1L, 1L, 11L);

            // then — 잔여 보상 없으므로 addExp/addGold 각 1회만
            assertThat(res.questCompleted()).isTrue();
            assertThat(res.reward().exp()).isEqualTo(12);
            assertThat(res.reward().gold()).isEqualTo(7);
            verify(characterService, times(1)).addExp(any(), anyInt(), any());
            verify(characterService, times(1)).addGold(any(), anyInt());
        }

        @Test
        @DisplayName("다른 사용자의 퀘스트 — IllegalArgumentException")
        void wrongUser() {
            // given — quest는 userId=2, 요청은 userId=1
            Quest quest = createQuest(2L, Grade.D, 25, 15);
            setId(quest, 1L);

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest));

            // when & then
            assertThatThrownBy(() -> questService.completeCheckpoint(1L, 1L, 10L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("권한이 없습니다");

            verify(checkpointRepository, never()).findById(any());
            verify(characterService, never()).addExp(any(), anyInt(), any());
        }

        @Test
        @DisplayName("퀘스트 없음 — EntityNotFoundException")
        void questNotFound() {
            given(questRepository.findByIdWithCheckpoints(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> questService.completeCheckpoint(1L, 99L, 10L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("퀘스트를 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("체크포인트 없음 — EntityNotFoundException")
        void checkpointNotFound() {
            Quest quest = createQuest(1L, Grade.D, 25, 15);
            setId(quest, 1L);

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest));
            given(checkpointRepository.findById(99L)).willReturn(Optional.empty());

            assertThatThrownBy(() -> questService.completeCheckpoint(1L, 1L, 99L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("체크포인트를 찾을 수 없습니다.");
        }

        @Test
        @DisplayName("다른 퀘스트의 체크포인트 — IllegalArgumentException")
        void checkpointFromDifferentQuest() {
            // given — quest(id=1)와 다른 퀘스트(id=2)의 체크포인트
            Quest quest1 = createQuest(1L, Grade.D, 25, 15);
            setId(quest1, 1L);

            Quest quest2 = createQuest(1L, Grade.D, 25, 15);
            setId(quest2, 2L);
            Checkpoint cpFromQuest2 = addCheckpoint(quest2, 20L, 1, 12, 7);

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest1));
            given(checkpointRepository.findById(20L)).willReturn(Optional.of(cpFromQuest2));

            // when & then
            assertThatThrownBy(() -> questService.completeCheckpoint(1L, 1L, 20L))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("퀘스트의 체크포인트가 아닙니다");

            verify(characterService, never()).addExp(any(), anyInt(), any());
        }

        @Test
        @DisplayName("이미 완료된 체크포인트 — IllegalStateException")
        void alreadyCompleted() {
            Quest quest = createQuest(1L, Grade.D, 25, 15);
            setId(quest, 1L);
            Checkpoint cp = addCheckpoint(quest, 10L, 1, 12, 7);
            cp.complete(); // 이미 완료

            given(questRepository.findByIdWithCheckpoints(1L)).willReturn(Optional.of(quest));
            given(checkpointRepository.findById(10L)).willReturn(Optional.of(cp));

            assertThatThrownBy(() -> questService.completeCheckpoint(1L, 1L, 10L))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("이미 완료된 체크포인트");

            verify(characterService, never()).addExp(any(), anyInt(), any());
        }
    }
}
