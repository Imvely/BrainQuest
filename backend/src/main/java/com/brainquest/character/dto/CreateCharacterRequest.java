package com.brainquest.character.dto;

import com.brainquest.character.entity.ClassType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.Map;

/**
 * 캐릭터 생성 요청.
 */
public record CreateCharacterRequest(
        @NotBlank String name,
        @NotNull ClassType classType,
        @NotNull Map<String, String> appearance
) {
}
