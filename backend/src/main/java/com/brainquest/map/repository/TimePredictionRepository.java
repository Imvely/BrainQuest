package com.brainquest.map.repository;

import com.brainquest.map.entity.TimePrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface TimePredictionRepository extends JpaRepository<TimePrediction, Long> {

    Optional<TimePrediction> findByTimeBlockId(Long blockId);

    @Query("SELECT tp FROM TimePrediction tp JOIN FETCH tp.timeBlock " +
           "WHERE tp.userId = :userId AND tp.createdAt BETWEEN :from AND :to ORDER BY tp.createdAt")
    List<TimePrediction> findAllByUserIdAndCreatedAtBetween(
            @Param("userId") Long userId,
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to);

    Optional<TimePrediction> findByIdAndUserId(Long id, Long userId);
}
