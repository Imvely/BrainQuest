package com.brainquest.character.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 장비 장착 요청.
 */
public record EquipRequest(
        @NotBlank @Size(max = 20) String slot,
        @NotNull Long itemId
) {
}
