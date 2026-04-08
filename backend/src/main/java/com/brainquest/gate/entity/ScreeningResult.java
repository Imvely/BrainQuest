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

import java.time.LocalDateTime;
import java.util.Map;

/**
 * ASRS 스크리�� 결과 엔티티.
 */
@Entity
@Table(name = "screening_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class ScreeningResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "test_type", length = 10, nullable = false)
    private TestType testType;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private Map<String, Integer> answers;

    @Column(name = "total_score", nullable = false)
    private int totalScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "risk_level", length = 10, nullable = false)
    private RiskLevel riskLevel;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public ScreeningResult(Long userId, TestType testType, Map<String, Integer> answers,
                           int totalScore, RiskLevel riskLevel) {
        this.userId = userId;
        this.testType = testType;
        this.answers = answers;
        this.totalScore = totalScore;
        this.riskLevel = riskLevel;
    }
}
