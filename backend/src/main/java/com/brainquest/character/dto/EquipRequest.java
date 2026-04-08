package com.brainquest.character.dto;

import jakarta.validation.constraints.NotNull;

/**
 * 장비 장착 요청.
 */
public record EquipRequest(
        @NotNull String slot,
        @NotNull Long itemId
) {
}
