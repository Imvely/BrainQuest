package com.brainquest.quest.repository;

import com.brainquest.quest.entity.Quest;
import com.brainquest.quest.entity.QuestCategory;
import com.brainquest.quest.entity.QuestStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface QuestRepository extends JpaRepository<Quest, Long> {

    @Query("SELECT DISTINCT q FROM Quest q LEFT JOIN FETCH q.checkpoints "
            + "WHERE q.userId = :userId AND q.status = :status ORDER BY q.createdAt DESC")
    List<Quest> findAllByUserIdAndStatusWithCheckpoints(
            @Param("userId") Long userId, @Param("status") QuestStatus status);

    @Query("SELECT DISTINCT q FROM Quest q LEFT JOIN FETCH q.checkpoints "
            + "WHERE q.userId = :userId AND q.status = :status AND q.category = :category "
            + "ORDER BY q.createdAt DESC")
    List<Quest> findAllByUserIdAndStatusAndCategoryWithCheckpoints(
            @Param("userId") Long userId, @Param("status") QuestStatus status,
            @Param("category") QuestCategory category);

    @Query("SELECT q FROM Quest q LEFT JOIN FETCH q.checkpoints WHERE q.id = :id")
    Optional<Quest> findByIdWithCheckpoints(@Param("id") Long id);

    int countByUserIdAndStatus(Long userId, QuestStatus status);
}
