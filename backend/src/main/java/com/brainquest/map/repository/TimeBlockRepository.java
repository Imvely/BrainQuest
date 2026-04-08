package com.brainquest.map.repository;

import com.brainquest.map.entity.TimeBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

public interface TimeBlockRepository extends JpaRepository<TimeBlock, Long> {

    List<TimeBlock> findAllByUserIdAndBlockDateOrderByStartTime(Long userId, LocalDate blockDate);

    List<TimeBlock> findAllByUserIdAndQuestId(Long userId, Long questId);

    Optional<TimeBlock> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT tb FROM TimeBlock tb WHERE tb.userId = :userId AND tb.blockDate = :blockDate "
            + "AND tb.startTime < :endTime AND tb.endTime > :startTime")
    List<TimeBlock> findOverlapping(@Param("userId") Long userId,
                                    @Param("blockDate") LocalDate blockDate,
                                    @Param("startTime") LocalTime startTime,
                                    @Param("endTime") LocalTime endTime);

    @Query("SELECT tb FROM TimeBlock tb WHERE tb.userId = :userId AND tb.blockDate = :blockDate "
            + "AND tb.startTime < :endTime AND tb.endTime > :startTime AND tb.id <> :excludeId")
    List<TimeBlock> findOverlappingExcluding(@Param("userId") Long userId,
                                             @Param("blockDate") LocalDate blockDate,
                                             @Param("startTime") LocalTime startTime,
                                             @Param("endTime") LocalTime endTime,
                                             @Param("excludeId") Long excludeId);

    List<TimeBlock> findAllByQuestId(Long questId);
}
