package com.brainquest.quest.repository;

import com.brainquest.quest.entity.Checkpoint;
import com.brainquest.quest.entity.CheckpointStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CheckpointRepository extends JpaRepository<Checkpoint, Long> {

    List<Checkpoint> findAllByQuestIdOrderByOrderNum(Long questId);

    int countByQuestIdAndStatus(Long questId, CheckpointStatus status);
}
