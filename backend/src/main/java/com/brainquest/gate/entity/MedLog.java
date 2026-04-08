package com.brainquest.gate.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * 약물 복용 기록 엔티티.
 */
@Entity
@Table(name = "med_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class MedLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "medication_id", nullable = false)
    private Long medicationId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "log_date", nullable = false)
    private LocalDate logDate;

    @Column(name = "taken_at", nullable = false)
    private LocalDateTime takenAt;

    @Column(name = "effectiveness")
    private Integer effectiveness;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "side_effects", columnDefinition = "jsonb")
    private List<String> sideEffects;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public MedLog(Long medicationId, Long userId, LocalDate logDate, LocalDateTime takenAt,
                  Integer effectiveness, List<String> sideEffects) {
        this.medicationId = medicationId;
        this.userId = userId;
        this.logDate = logDate;
        this.takenAt = takenAt;
        this.effectiveness = effectiveness;
        this.sideEffects = sideEffects;
    }
}
