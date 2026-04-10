package com.brainquest.gate.repository;

import com.brainquest.gate.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MedicationRepository extends JpaRepository<Medication, Long> {

    List<Medication> findAllByUserIdAndActiveTrue(Long userId);

    List<Medication> findAllByUserIdOrderByScheduleTime(Long userId);

    Optional<Medication> findByIdAndUserId(Long id, Long userId);
}
