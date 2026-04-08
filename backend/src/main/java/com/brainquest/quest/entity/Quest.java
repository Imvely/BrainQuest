package com.brainquest.quest.entity;

import com.brainquest.common.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "quests")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Quest extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "original_title", length = 300, nullable = false)
    private String originalTitle;

    @Column(name = "quest_title", length = 300, nullable = false)
    private String questTitle;

    @Column(name = "quest_story", columnDefinition = "TEXT", nullable = false)
    private String questStory;

    @Enumerated(EnumType.STRING)
    @Column(length = 20, nullable = false)
    private QuestCategory category;

    @Enumerated(EnumType.STRING)
    @Column(length = 5, nullable = false)
    private Grade grade;

    @Column(name = "estimated_min", nullable = false)
    private int estimatedMin;

    @Column(name = "exp_reward", nullable = false)
    private int expReward;

    @Column(name = "gold_reward", nullable = false)
    private int goldReward;

    @Enumerated(EnumType.STRING)
    @Column(length = 15, nullable = false)
    private QuestStatus status = QuestStatus.ACTIVE;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "quest", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderNum ASC")
    private List<Checkpoint> checkpoints = new ArrayList<>();

    @Builder
    public Quest(Long userId, String originalTitle, String questTitle, String questStory,
                 QuestCategory category, Grade grade, int estimatedMin,
                 int expReward, int goldReward, LocalDate dueDate) {
        this.userId = userId;
        this.originalTitle = originalTitle;
        this.questTitle = questTitle;
        this.questStory = questStory;
        this.category = category;
        this.grade = grade;
        this.estimatedMin = estimatedMin;
        this.expReward = expReward;
        this.goldReward = goldReward;
        this.dueDate = dueDate;
    }

    public void complete() {
        this.status = QuestStatus.COMPLETED;
        this.completedAt = LocalDateTime.now();
    }

    public void addCheckpoint(Checkpoint checkpoint) {
        this.checkpoints.add(checkpoint);
        checkpoint.assignQuest(this);
    }
}
