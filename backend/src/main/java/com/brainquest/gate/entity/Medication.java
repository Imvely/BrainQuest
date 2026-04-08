package com.brainquest.gate.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 약물 정보 엔티티.
 */
@Entity
@Table(name = "medications")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class Medication {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "med_name", length = 100, nullable = false)
    private String medName;

    @Column(name = "dosage", length = 50, nullable = false)
    private String dosage;

    @Column(name = "schedule_time", nullable = false)
    private LocalTime scheduleTime;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public Medication(Long userId, String medName, String dosage, LocalTime scheduleTime) {
        this.userId = userId;
        this.medName = medName;
        this.dosage = dosage;
        this.scheduleTime = scheduleTime;
        this.active = true;
    }
}
