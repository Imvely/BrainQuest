package com.brainquest.quest.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "checkpoints")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Checkpoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quest_id", nullable = false)
    private Quest quest;

    @Column(name = "order_num", nullable = false)
    private int orderNum;

    @Column(length = 300, nullable = false)
    private String title;

    @Column(name = "estimated_min", nullable = false)
    private int estimatedMin;

    @Column(name = "exp_reward", nullable = false)
    private int expReward;

    @Column(name = "gold_reward", nullable = false)
    private int goldReward;

    @Enumerated(EnumType.STRING)
    @Column(length = 15, nullable = false)
    private CheckpointStatus status = CheckpointStatus.PENDING;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Version
    private int version;

    @Builder
    public Checkpoint(int orderNum, String title, int estimatedMin,
                      int expReward, int goldReward) {
        this.orderNum = orderNum;
        this.title = title;
        this.estimatedMin = estimatedMin;
        this.expReward = expReward;
        this.goldReward = goldReward;
    }

    public void assignQuest(Quest quest) {
        this.quest = quest;
    }

    public void complete() {
        this.status = CheckpointStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }
}
