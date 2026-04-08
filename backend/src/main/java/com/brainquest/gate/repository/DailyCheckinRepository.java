package com.brainquest.gate.repository;

import com.brainquest.gate.entity.CheckinType;
import com.brainquest.gate.entity.DailyCheckin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyCheckinRepository extends JpaRepository<DailyCheckin, Long> {

    Optional<DailyCheckin> findByUserIdAndCheckinDateAndCheckinType(
            Long userId, LocalDate checkinDate, CheckinType checkinType);

    boolean existsByUserIdAndCheckinDateAndCheckinType(
            Long userId, LocalDate checkinDate, CheckinType checkinType);

    List<DailyCheckin> findByUserIdAndCheckinDateBetweenOrderByCheckinDateDesc(
            Long userId, LocalDate from, LocalDate to);
}
