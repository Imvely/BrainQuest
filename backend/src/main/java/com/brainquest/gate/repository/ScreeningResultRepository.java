package com.brainquest.gate.repository;

import com.brainquest.gate.entity.ScreeningResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScreeningResultRepository extends JpaRepository<ScreeningResult, Long> {

    List<ScreeningResult> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
