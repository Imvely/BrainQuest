package com.brainquest.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * 소셜 로그인 요청 DTO.
 *
 * @param provider    소셜 로그인 제공자 (KAKAO, APPLE, GOOGLE)
 * @param accessToken 소셜 로그인에서 발급받은 Access Token
 */
public record LoginRequest(
        @NotBlank(message = "provider는 필수입니다.") String provider,
        @NotBlank(message = "accessToken은 필수입니다.") String accessToken
) {
}
