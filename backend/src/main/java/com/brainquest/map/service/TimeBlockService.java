package com.brainquest.map.service;

import com.brainquest.auth.entity.User;
import com.brainquest.auth.repository.UserRepository;
import com.brainquest.battle.entity.BattleSession;
import com.brainquest.battle.repository.BattleSessionRepository;
import com.brainquest.common.exception.DuplicateResourceException;
import com.brainquest.common.exception.EntityNotFoundException;
import com.brainquest.map.dto.*;
import com.brainquest.map.entity.BlockStatus;
import com.brainquest.map.entity.TimeBlock;
import com.brainquest.map.repository.TimeBlockRepository;
import com.brainquest.quest.entity.Quest;
import com.brainquest.quest.entity.QuestStatus;
import com.brainquest.quest.repository.QuestRepository;
import com.brainquest.sky.entity.EmotionRecord;
import com.brainquest.sky.repository.EmotionRecordRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TimeBlockService {

    private final TimeBlockRepository timeBlockRepository;
    private final UserRepository userRepository;
    private final QuestRepository questRepository;
    private final BattleSessionRepository battleSessionRepository;
    private final EmotionRecordRepository emotionRecordRepository;

    @Transactional
    public BlockResponse createBlock(Long userId, CreateBlockRequest req) {
        // 시간 유효성 검증
        validateTimeRange(req.startTime(), req.endTime());

        // 시간 겹침 체크
        List<TimeBlock> overlapping = timeBlockRepository.findOverlapping(
                userId, req.blockDate(), req.startTime(), req.endTime());
        if (!overlapping.isEmpty()) {
            throw new DuplicateResourceException("MAP_001", "해당 시간대에 이미 블록이 존재합니다.");
        }

        TimeBlock block = TimeBlock.builder()
                .userId(userId)
                .blockDate(req.blockDate())
                .startTime(req.startTime())
                .endTime(req.endTime())
                .category(req.category())
                .title(req.title())
                .questId(req.questId())
                .build();

        block = timeBlockRepository.save(block);
        log.debug("타임블록 생성: userId={}, blockId={}, date={}", userId, block.getId(), req.blockDate());
        return BlockResponse.from(block);
    }

    @Transactional
    public BlockResponse updateBlock(Long userId, Long blockId, UpdateBlockRequest req) {
        TimeBlock block = findBlockByIdAndUserId(blockId, userId);

        // 시간 변경 시 유효성 + 겹침 체크
        LocalTime newStart = req.startTime() != null ? req.startTime() : block.getStartTime();
        LocalTime newEnd = req.endTime() != null ? req.endTime() : block.getEndTime();
        if (req.startTime() != null || req.endTime() != null) {
            validateTimeRange(newStart, newEnd);
            List<TimeBlock> overlapping = timeBlockRepository.findOverlappingExcluding(
                    userId, block.getBlockDate(), newStart, newEnd, blockId);
            if (!overlapping.isEmpty()) {
                throw new DuplicateResourceException("MAP_001", "해당 시간대에 이미 블록이 존재합니다.");
            }
        }

        block.update(req.startTime(), req.endTime(), req.category(), req.title(), req.status());
        block = timeBlockRepository.save(block);
        log.debug("타임블록 수정: userId={}, blockId={}", userId, blockId);
        return BlockResponse.from(block);
    }

    @Transactional
    public void deleteBlock(Long userId, Long blockId) {
        TimeBlock block = findBlockByIdAndUserId(blockId, userId);
        timeBlockRepository.delete(block);
        log.debug("타임블록 삭제: userId={}, blockId={}", userId, blockId);
    }

    public TimelineResponse getTimeline(Long userId, LocalDate date) {
        // 타임블록 목록
        List<TimeBlock> blocks = timeBlockRepository.findAllByUserIdAndBlockDateOrderByStartTime(userId, date);
        List<BlockResponse> blockResponses = blocks.stream().map(BlockResponse::from).toList();

        // 퀘스트 요약 (연결된 퀘스트)
        List<Long> questIds = blocks.stream()
                .map(TimeBlock::getQuestId)
                .filter(qid -> qid != null)
                .distinct()
                .toList();
        int completedQuests = 0;
        int totalQuests = questIds.size();
        if (!questIds.isEmpty()) {
            List<Quest> quests = questRepository.findAllById(questIds);
            completedQuests = (int) quests.stream()
                    .filter(q -> q.getStatus() == QuestStatus.COMPLETED)
                    .count();
        }

        // 전투 세션 (해당 날짜)
        LocalDateTime dayStart = date.atStartOfDay();
        LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();
        List<BattleSession> battles = battleSessionRepository.findAllByUserIdAndStartedAtBetween(
                userId, dayStart, dayEnd);
        List<TimelineResponse.BattleSessionSummary> battleSummaries = battles.stream()
                .map(bs -> new TimelineResponse.BattleSessionSummary(
                        bs.getId(),
                        bs.getMonsterType(),
                        bs.getResult() != null ? bs.getResult().name() : null,
                        bs.getPlannedMin(),
                        bs.getActualMin()
                )).toList();

        // 남은 시간
        int remainingMin = calculateRemainingMin(userId);

        // 감정 기록 (SKY 모듈 연동)
        List<EmotionRecord> emotions = emotionRecordRepository
                .findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(userId, dayStart, dayEnd);
        List<TimelineResponse.EmotionSummary> emotionRecords = emotions.stream()
                .map(e -> new TimelineResponse.EmotionSummary(
                        e.getId(),
                        e.getWeatherType().name(),
                        e.getIntensity(),
                        e.getMemo()))
                .toList();

        return new TimelineResponse(
                blockResponses,
                remainingMin,
                new TimelineResponse.QuestSummary(completedQuests, totalQuests),
                battleSummaries,
                emotionRecords
        );
    }

    @Transactional
    public BlockResponse completeBlock(Long userId, Long blockId) {
        TimeBlock block = findBlockByIdAndUserId(blockId, userId);
        block.complete();
        block = timeBlockRepository.save(block);
        log.debug("타임블록 완료: userId={}, blockId={}", userId, blockId);
        return BlockResponse.from(block);
    }

    public RemainingTimeResponse getRemainingTime(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("MAP_003", "사용자를 찾을 수 없습니다."));
        int remainingMin = calculateRemainingMin(user.getSleepTime());
        return new RemainingTimeResponse(remainingMin, user.getSleepTime());
    }

    // ── private helpers ──

    private TimeBlock findBlockByIdAndUserId(Long blockId, Long userId) {
        return timeBlockRepository.findByIdAndUserId(blockId, userId)
                .orElseThrow(() -> new EntityNotFoundException("MAP_002", "타임블록을 찾을 수 없습니다."));
    }

    private int calculateRemainingMin(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("MAP_003", "사용자를 찾을 수 없습니다."));
        return calculateRemainingMin(user.getSleepTime());
    }

    private int calculateRemainingMin(LocalTime sleepTime) {
        LocalTime now = LocalTime.now();
        long minutes = Duration.between(now, sleepTime).toMinutes();
        return Math.max(0, (int) minutes);
    }

    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new IllegalArgumentException("시작 시간은 종료 시간보다 이전이어야 합니다.");
        }
    }
}
