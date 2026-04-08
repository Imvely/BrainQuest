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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class QuestService {

    private static final Map<Grade, int[]> GRADE_REWARDS = Map.of(
            Grade.E, new int[]{10, 5},
            Grade.D, new int[]{25, 15},
            Grade.C, new int[]{50, 30},
            Grade.B, new int[]{100, 60},
            Grade.A, new int[]{200, 120}
    );

    private final QuestRepository questRepository;
    private final CheckpointRepository checkpointRepository;
    private final ClaudeApiClient claudeApiClient;
    private final CharacterService characterService;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Claude API를 호출하여 할 일을 RPG 퀘스트로 변환한다 (아직 저장하지 않음).
     */
    @Transactional
    public GenerateQuestResponse generateQuest(Long userId, GenerateQuestRequest req) {
        QuestGenerationResult result = claudeApiClient.generateQuestStory(
                userId, req.originalTitle(), req.estimatedMin(), req.category());

        Grade grade = calculateGrade(req.estimatedMin());
        int[] rewards = GRADE_REWARDS.get(grade);
        int totalExp = rewards[0];
        int totalGold = rewards[1];

        List<CheckpointResponse> checkpointResponses = distributeCheckpointRewards(
                result.checkpoints(), totalExp, totalGold);

        return new GenerateQuestResponse(
                req.originalTitle(),
                result.questTitle(),
                result.questStory(),
                grade,
                req.estimatedMin(),
                totalExp,
                totalGold,
                checkpointResponses
        );
    }

    /**
     * 퀘스트를 저장한다 (Quest + Checkpoint 리스트).
     */
    @Transactional
    public QuestResponse saveQuest(Long userId, SaveQuestRequest req) {
        int[] rewards = GRADE_REWARDS.get(req.grade());
        int totalExp = rewards[0];
        int totalGold = rewards[1];

        Quest quest = Quest.builder()
                .userId(userId)
                .originalTitle(req.originalTitle())
                .questTitle(req.questTitle())
                .questStory(req.questStory())
                .category(req.category())
                .grade(req.grade())
                .estimatedMin(req.estimatedMin())
                .expReward(totalExp)
                .goldReward(totalGold)
                .dueDate(req.dueDate())
                .build();

        List<CheckpointResponse> cpRewards = distributeCheckpointRewards(
                req.checkpoints().stream()
                        .map(cp -> new QuestGenerationResult.CheckpointData(cp.title(), cp.estimatedMin()))
                        .toList(),
                totalExp, totalGold);

        for (int i = 0; i < req.checkpoints().size(); i++) {
            CheckpointRequest cpReq = req.checkpoints().get(i);
            CheckpointResponse cpReward = cpRewards.get(i);
            Checkpoint checkpoint = Checkpoint.builder()
                    .orderNum(i + 1)
                    .title(cpReq.title())
                    .estimatedMin(cpReq.estimatedMin())
                    .expReward(cpReward.expReward())
                    .goldReward(cpReward.goldReward())
                    .build();
            quest.addCheckpoint(checkpoint);
        }

        quest = questRepository.save(quest);
        log.debug("퀘스트 저장: userId={}, questId={}, grade={}", userId, quest.getId(), quest.getGrade());

        int totalCheckpoints = quest.getCheckpoints().size();
        return QuestResponse.of(quest, 0, totalCheckpoints);
    }

    /**
     * 활성 퀘스트 목록을 조회한다.
     */
    public List<QuestResponse> getActiveQuests(Long userId, QuestCategory category) {
        List<Quest> quests;
        if (category != null) {
            quests = questRepository.findAllByUserIdAndStatusAndCategoryWithCheckpoints(
                    userId, QuestStatus.ACTIVE, category);
        } else {
            quests = questRepository.findAllByUserIdAndStatusWithCheckpoints(
                    userId, QuestStatus.ACTIVE);
        }

        return quests.stream().map(quest -> {
            int total = quest.getCheckpoints().size();
            int completed = (int) quest.getCheckpoints().stream()
                    .filter(cp -> cp.getStatus() == CheckpointStatus.COMPLETED)
                    .count();
            return QuestResponse.of(quest, completed, total);
        }).toList();
    }

    /**
     * 퀘스트 상세를 조회한다 (체크포인트 포함, 소유자 검증).
     */
    public QuestDetailResponse getQuestDetail(Long userId, Long questId) {
        Quest quest = findQuestById(questId);
        if (!quest.getUserId().equals(userId)) {
            throw new EntityNotFoundException("QUEST_002", "퀘스트를 찾을 수 없습니다.");
        }
        List<CheckpointResponse> checkpoints = quest.getCheckpoints().stream()
                .map(CheckpointResponse::from)
                .toList();
        return QuestDetailResponse.of(quest, checkpoints);
    }

    /**
     * 체크포인트를 완료 처리한다.
     * <p>모든 체크포인트 완료 시 퀘스트도 완료 처리된다.</p>
     */
    @Transactional
    public CheckpointCompleteResponse completeCheckpoint(Long userId, Long questId, Long checkpointId) {
        Quest quest = findQuestById(questId);
        if (!quest.getUserId().equals(userId)) {
            throw new IllegalArgumentException("해당 퀘스트에 대한 권한이 없습니다.");
        }

        Checkpoint checkpoint = checkpointRepository.findById(checkpointId)
                .orElseThrow(() -> new EntityNotFoundException("QUEST_003", "체크포인트를 찾을 수 없습니다."));

        if (!checkpoint.getQuest().getId().equals(questId)) {
            throw new IllegalArgumentException("해당 퀘스트의 체크포인트가 아닙니다.");
        }

        if (checkpoint.getStatus() == CheckpointStatus.COMPLETED) {
            throw new IllegalStateException("이미 완료된 체크포인트입니다.");
        }

        // 체크포인트 완료
        checkpoint.complete();
        checkpointRepository.save(checkpoint);

        // 체크포인트 보상 지급
        characterService.addExp(userId, checkpoint.getExpReward(), StatType.WIS);
        characterService.addGold(userId, checkpoint.getGoldReward());

        // 이벤트 발행
        eventPublisher.publishEvent(new CheckpointCompletedEvent(
                this, userId, checkpointId, questId, checkpoint.getExpReward()));

        int totalRewardExp = checkpoint.getExpReward();
        int totalRewardGold = checkpoint.getGoldReward();
        boolean questCompleted = false;
        UserItemResponse itemDrop = null;

        // 모든 체크포인트 완료 여부 체크
        int completedCount = countCompletedCheckpoints(quest);
        int totalCount = quest.getCheckpoints().size();

        if (completedCount == totalCount) {
            quest.complete();
            questRepository.save(quest);
            questCompleted = true;

            // 퀘스트 전체 보상 잔여분 지급
            int cpTotalExp = quest.getCheckpoints().stream().mapToInt(Checkpoint::getExpReward).sum();
            int cpTotalGold = quest.getCheckpoints().stream().mapToInt(Checkpoint::getGoldReward).sum();
            int remainingExp = quest.getExpReward() - cpTotalExp;
            int remainingGold = quest.getGoldReward() - cpTotalGold;
            if (remainingExp > 0) {
                characterService.addExp(userId, remainingExp, StatType.WIS);
                totalRewardExp += remainingExp;
            }
            if (remainingGold > 0) {
                characterService.addGold(userId, remainingGold);
                totalRewardGold += remainingGold;
            }

            // 아이템 드롭
            itemDrop = characterService.dropItem(userId, quest.getGrade().name());

            // 퀘스트 완료 이벤트 발행
            eventPublisher.publishEvent(new QuestCompletedEvent(
                    this, userId, questId, quest.getGrade().name(),
                    quest.getExpReward(), quest.getGoldReward()));

            log.info("퀘스트 완료! userId={}, questId={}, grade={}", userId, questId, quest.getGrade());
        }

        return new CheckpointCompleteResponse(
                CheckpointResponse.from(checkpoint),
                new RewardResponse(totalRewardExp, totalRewardGold),
                questCompleted,
                itemDrop
        );
    }

    // ── private helpers ──

    private Quest findQuestById(Long questId) {
        return questRepository.findByIdWithCheckpoints(questId)
                .orElseThrow(() -> new EntityNotFoundException("QUEST_002", "퀘스트를 찾을 수 없습니다."));
    }

    private Grade calculateGrade(int estimatedMin) {
        if (estimatedMin <= 10) return Grade.E;
        if (estimatedMin <= 30) return Grade.D;
        if (estimatedMin <= 60) return Grade.C;
        if (estimatedMin <= 120) return Grade.B;
        return Grade.A;
    }

    private int countCompletedCheckpoints(Quest quest) {
        return (int) quest.getCheckpoints().stream()
                .filter(cp -> cp.getStatus() == CheckpointStatus.COMPLETED)
                .count();
    }

    /**
     * 체크포인트 보상을 분배한다.
     * <p>마지막 체크포인트는 +20% 보너스.</p>
     */
    private List<CheckpointResponse> distributeCheckpointRewards(
            List<QuestGenerationResult.CheckpointData> checkpointDataList,
            int totalExp, int totalGold) {

        int size = checkpointDataList.size();
        if (size == 0) return List.of();

        int baseExp = totalExp / size;
        int baseGold = totalGold / size;

        List<CheckpointResponse> responses = new ArrayList<>();
        for (int i = 0; i < size; i++) {
            int cpExp = baseExp;
            int cpGold = baseGold;

            // 마지막 체크포인트 +20%
            if (i == size - 1) {
                cpExp = (int) (baseExp * 1.2);
                cpGold = (int) (baseGold * 1.2);
            }

            QuestGenerationResult.CheckpointData cpd = checkpointDataList.get(i);
            responses.add(new CheckpointResponse(
                    null, i + 1, cpd.title(), cpd.estimatedMin(),
                    cpExp, cpGold, CheckpointStatus.PENDING, null));
        }
        return responses;
    }
}
