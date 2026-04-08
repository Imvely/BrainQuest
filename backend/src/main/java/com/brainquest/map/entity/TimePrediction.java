package com.brainquest.map.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "time_predictions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class TimePrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "block_id", nullable = false)
    private TimeBlock timeBlock;

    @Column(name = "predicted_min", nullable = false)
    private int predictedMin;

    @Column(name = "actual_min")
    private Integer actualMin;

    @Column(name = "accuracy_pct", precision = 5, scale = 2)
    private BigDecimal accuracyPct;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public TimePrediction(Long userId, TimeBlock timeBlock, int predictedMin) {
        this.userId = userId;
        this.timeBlock = timeBlock;
        this.predictedMin = predictedMin;
    }

    public void recordActual(int actualMin) {
        this.actualMin = actualMin;
        double accuracy = Math.max(0, 100.0 - Math.abs(predictedMin - actualMin) / (double) predictedMin * 100.0);
        this.accuracyPct = BigDecimal.valueOf(accuracy).setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
