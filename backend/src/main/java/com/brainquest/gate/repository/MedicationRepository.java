package com.brainquest.gate.repository;

import com.brainquest.gate.entity.Medication;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MedicationRepository extends JpaRepository<Medication, Long> {

    List<Medication> findAllByUserIdAndActiveTrue(Long userId);
}
