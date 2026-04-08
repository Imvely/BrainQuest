package com.brainquest.character.dto;

import com.brainquest.character.entity.UserItem;

import java.time.LocalDateTime;

/**
 * 사용자 보유 아이템 응답.
 */
public record UserItemResponse(
        Long id,
        ItemResponse item,
        LocalDateTime acquiredAt,
        String source
) {
    public static UserItemResponse from(UserItem userItem) {
        return new UserItemResponse(
                userItem.getId(),
                ItemResponse.from(userItem.getItem()),
                userItem.getAcquiredAt(),
                userItem.getSource()
        );
    }
}
