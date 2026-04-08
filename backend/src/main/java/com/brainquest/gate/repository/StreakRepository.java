package com.brainquest.gate.repository;

import com.brainquest.gate.entity.Streak;
import com.brainquest.gate.entity.StreakType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StreakRepository extends JpaRepository<Streak, Long> {

    Optional<Streak> findByUserIdAndStreakType(Long userId, StreakType streakType);

    List<Streak> findAllByUserId(Long userId);
}
