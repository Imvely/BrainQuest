package com.brainquest.battle.repository;

import com.brainquest.battle.entity.BattleResult;
import com.brainquest.battle.entity.BattleSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BattleSessionRepository extends JpaRepository<BattleSession, Long> {

    Optional<BattleSession> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT bs FROM BattleSession bs WHERE bs.userId = :userId AND bs.result IS NULL AND bs.endedAt IS NULL")
    Optional<BattleSession> findActiveByUserId(@Param("userId") Long userId);

    List<BattleSession> findAllByUserIdAndStartedAtBetween(Long userId, LocalDateTime from, LocalDateTime to);

    long countByUserIdAndResultAndStartedAtAfter(Long userId, BattleResult result, LocalDateTime after);
}
