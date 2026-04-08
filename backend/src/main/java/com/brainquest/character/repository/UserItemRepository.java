package com.brainquest.character.repository;

import com.brainquest.character.entity.UserItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserItemRepository extends JpaRepository<UserItem, Long> {

    @Query("SELECT ui FROM UserItem ui JOIN FETCH ui.item WHERE ui.user.id = :userId")
    List<UserItem> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT ui FROM UserItem ui JOIN FETCH ui.item WHERE ui.user.id = :userId AND ui.item.id = :itemId")
    Optional<UserItem> findByUserIdAndItemId(@Param("userId") Long userId, @Param("itemId") Long itemId);
}
