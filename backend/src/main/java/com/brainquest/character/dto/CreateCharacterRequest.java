package com.brainquest.character.dto;

import com.brainquest.character.entity.ClassType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

/**
 * 캐릭터 생성 요청.
 */
public record CreateCharacterRequest(
        @NotBlank @Size(max = 30) String name,
        @NotNull ClassType classType,
        @NotNull @Size(max = 10) Map<String, String> appearance
) {
}
