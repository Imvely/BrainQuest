package com.brainquest.event.listeners;

import com.brainquest.event.events.QuestCompletedEvent;
import com.brainquest.map.entity.BlockCategory;
import com.brainquest.map.entity.BlockStatus;
import com.brainquest.map.entity.TimeBlock;
import com.brainquest.map.repository.TimeBlockRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MapBlockCompleter 단위 테스트")
class MapEventListenerTest {

    @InjectMocks
    private MapEventListener.MapBlockCompleter mapBlockCompleter;

    @Mock
    private TimeBlockRepository timeBlockRepository;

    // ── 헬퍼 메서드 ──

    private TimeBlock createBlock(Long id, Long userId, Long questId, BlockStatus status) {
        TimeBlock block = TimeBlock.builder()
                .userId(userId)
                .blockDate(LocalDate.of(2026, 4, 8))
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(10, 0))
                .category(BlockCategory.WORK)
                .title("퀘스트 블록")
                .questId(questId)
                .build();
        ReflectionTestUtils.setField(block, "id", id);
        if (status == BlockStatus.COMPLETED) {
            block.complete();
        }
        return block;
    }

    // ──────────────────────────────────────────────
    // completeBlocksByQuestId
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("completeBlocksByQuestId")
    class CompleteBlocksByQuestId {

        @Test
        @DisplayName("정상 — 연결된 타임블록을 COMPLETED로 변경")
        void completesLinkedBlocks() {
            // given
            Long questId = 10L;
            TimeBlock block1 = createBlock(1L, 1L, questId, BlockStatus.PLANNED);
            TimeBlock block2 = createBlock(2L, 1L, questId, BlockStatus.IN_PROGRESS);

            given(timeBlockRepository.findAllByQuestId(questId))
                    .willReturn(List.of(block1, block2));

            // when
            mapBlockCompleter.completeBlocksByQuestId(questId);

            // then
            assertThat(block1.getStatus()).isEqualTo(BlockStatus.COMPLETED);
            assertThat(block1.getActualEnd()).isNotNull();
            assertThat(block2.getStatus()).isEqualTo(BlockStatus.COMPLETED);
            assertThat(block2.getActualEnd()).isNotNull();
        }

        @Test
        @DisplayName("연결된 블록 없음 — 아무 동작 없음")
        void noLinkedBlocks() {
            // given
            given(timeBlockRepository.findAllByQuestId(10L)).willReturn(List.of());

            // when
            mapBlockCompleter.completeBlocksByQuestId(10L);

            // then — 예외 없이 정상 종료
        }

        @Test
        @DisplayName("이미 완료된 블록 — 중복 완료 방지")
        void alreadyCompletedBlocks() {
            // given
            Long questId = 10L;
            TimeBlock completedBlock = createBlock(1L, 1L, questId, BlockStatus.COMPLETED);
            TimeBlock pendingBlock = createBlock(2L, 1L, questId, BlockStatus.PLANNED);

            given(timeBlockRepository.findAllByQuestId(questId))
                    .willReturn(List.of(completedBlock, pendingBlock));

            // when
            mapBlockCompleter.completeBlocksByQuestId(questId);

            // then — 미완료 블록만 완료 처리됨
            assertThat(pendingBlock.getStatus()).isEqualTo(BlockStatus.COMPLETED);
            assertThat(pendingBlock.getActualEnd()).isNotNull();
        }
    }
}
