package com.brainquest.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 토큰 갱신 요청 DTO.
 *
 * @param refreshToken JWT Refresh Token
 */
public record RefreshRequest(
        @NotBlank(message = "refreshToken은 필수입니다.") String refreshToken
) {
}
