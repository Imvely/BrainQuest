package com.brainquest.sky.repository;

import com.brainquest.sky.entity.EmotionRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface EmotionRecordRepository extends JpaRepository<EmotionRecord, Long> {

    List<EmotionRecord> findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt(
            Long userId, LocalDateTime from, LocalDateTime to);

    long countByUserIdAndRecordedAtBetween(
            Long userId, LocalDateTime from, LocalDateTime to);
}
