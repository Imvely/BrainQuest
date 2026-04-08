package com.brainquest.map.repository;

import com.brainquest.map.entity.TimePrediction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TimePredictionRepository extends JpaRepository<TimePrediction, Long> {

    Optional<TimePrediction> findByTimeBlockId(Long blockId);

    List<TimePrediction> findAllByUserIdAndCreatedAtBetween(Long userId, LocalDateTime from, LocalDateTime to);

    Optional<TimePrediction> findByIdAndUserId(Long id, Long userId);
}
