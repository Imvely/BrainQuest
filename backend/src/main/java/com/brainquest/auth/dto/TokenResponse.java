package com.brainquest.auth.dto;

/**
 * JWT 토큰 발급 응답 DTO.
 *
 * @param accessToken  JWT Access Token
 * @param refreshToken JWT Refresh Token
 * @param userId       사용자 ID
 * @param nickname     사용자 닉네임
 * @param isNewUser    신규 사용자 여부 (온보딩 필요 여부 판단용)
 */
public record TokenResponse(
        String accessToken,
        String refreshToken,
        Long userId,
        String nickname,
        boolean isNewUser
) {
}
