package com.brainquest.event.listeners;

import com.brainquest.event.events.QuestCompletedEvent;
import com.brainquest.map.entity.BlockStatus;
import com.brainquest.map.entity.TimeBlock;
import com.brainquest.map.repository.TimeBlockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.List;

/**
 * MAP 모듈 이벤트 리스너.
 *
 * <p>퀘스트 완료 시 연결된 타임블록을 자동 완료 처리한다.</p>
 * <p>AFTER_COMMIT 리스너에서 별도 @Transactional 서비스를 호출하여
 * 원본 트랜잭션과 분리된 새 트랜잭션에서 원자적으로 처리한다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MapEventListener {

    private final MapBlockCompleter mapBlockCompleter;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void handleQuestCompleted(QuestCompletedEvent event) {
        mapBlockCompleter.completeBlocksByQuestId(event.getQuestId());
    }

    /**
     * 내부 트랜잭션 처리용 빈.
     * <p>@TransactionalEventListener와 @Transactional을 같은 메서드에
     * 적용할 수 없으므로 별도 빈으로 분리한다.</p>
     */
    @Service
    @RequiredArgsConstructor
    static class MapBlockCompleter {

        private final TimeBlockRepository timeBlockRepository;

        @Transactional
        public void completeBlocksByQuestId(Long questId) {
            List<TimeBlock> blocks = timeBlockRepository.findAllByQuestId(questId);
            for (TimeBlock block : blocks) {
                if (block.getStatus() != BlockStatus.COMPLETED) {
                    block.complete();
                    log.debug("퀘스트 완료로 타임블록 자동 완료: questId={}, blockId={}",
                            questId, block.getId());
                }
            }
        }
    }
}
