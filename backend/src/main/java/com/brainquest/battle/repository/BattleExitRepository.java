package com.brainquest.battle.repository;

import com.brainquest.battle.entity.BattleExit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BattleExitRepository extends JpaRepository<BattleExit, Long> {

    List<BattleExit> findAllBySessionId(Long sessionId);

    Optional<BattleExit> findFirstBySessionIdAndReturnAtIsNullOrderByExitAtDesc(Long sessionId);
}
