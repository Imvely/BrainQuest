package com.brainquest.gate.repository;

import com.brainquest.gate.entity.MedLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface MedLogRepository extends JpaRepository<MedLog, Long> {

    List<MedLog> findByUserIdAndLogDate(Long userId, LocalDate logDate);
}
