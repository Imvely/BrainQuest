package com.brainquest.map.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "time_blocks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@EntityListeners(AuditingEntityListener.class)
public class TimeBlock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "block_date", nullable = false)
    private LocalDate blockDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private BlockCategory category;

    @Column(length = 200, nullable = false)
    private String title;

    @Column(name = "quest_id")
    private Long questId;

    @Enumerated(EnumType.STRING)
    @Column(length = 15, nullable = false)
    private BlockStatus status = BlockStatus.PLANNED;

    @Column(name = "actual_start")
    private LocalDateTime actualStart;

    @Column(name = "actual_end")
    private LocalDateTime actualEnd;

    @Enumerated(EnumType.STRING)
    @Column(length = 15, nullable = false)
    private BlockSource source = BlockSource.MANUAL;

    @Column(name = "is_buffer", nullable = false)
    private boolean buffer = false;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public TimeBlock(Long userId, LocalDate blockDate, LocalTime startTime, LocalTime endTime,
                     BlockCategory category, String title, Long questId, BlockSource source,
                     boolean buffer) {
        this.userId = userId;
        this.blockDate = blockDate;
        this.startTime = startTime;
        this.endTime = endTime;
        this.category = category;
        this.title = title;
        this.questId = questId;
        this.source = source != null ? source : BlockSource.MANUAL;
        this.buffer = buffer;
    }

    public void update(LocalTime startTime, LocalTime endTime, BlockCategory category,
                       String title, BlockStatus status) {
        if (startTime != null) this.startTime = startTime;
        if (endTime != null) this.endTime = endTime;
        if (category != null) this.category = category;
        if (title != null) this.title = title;
        if (status != null) this.status = status;
    }

    public void complete() {
        this.status = BlockStatus.COMPLETED;
        this.actualEnd = LocalDateTime.now();
    }
}
