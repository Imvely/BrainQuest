package com.brainquest.auth.service;

import com.brainquest.auth.dto.LoginRequest;
import com.brainquest.auth.dto.TokenResponse;
import com.brainquest.auth.entity.User;
import com.brainquest.auth.repository.UserRepository;
import com.brainquest.auth.security.JwtTokenProvider;
import com.brainquest.common.exception.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 인증 서비스.
 * <p>소셜 로그인 처리 및 JWT 토큰 발급/갱신을 담당한다.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final SocialLoginService socialLoginService;
    private final UserWriter userWriter;

    /**
     * 소셜 로그인을 처리하고 JWT 토큰을 발급한다.
     * <p>외부 API 호출(소셜 프로필 조회)은 트랜잭션 밖에서,
     * DB upsert는 {@link UserWriter}를 통해 별도 트랜잭션에서 수행하여
     * DB 커넥션 점유를 최소화한다.</p>
     *
     * @param request 소셜 로그인 요청 (provider + accessToken)
     * @return JWT 토큰 응답
     */
    public TokenResponse login(LoginRequest request) {
        // 1) 외부 API 호출 — 트랜잭션 밖
        Map<String, String> socialProfile = socialLoginService.getUserProfile(
                request.provider(), request.accessToken());

        String providerId = socialProfile.get("id");
        String email = socialProfile.get("email");
        String nickname = socialProfile.get("nickname");

        // 2) DB upsert — UserWriter 트랜잭션
        UserWriter.UpsertResult result = userWriter.upsert(
                request.provider(), providerId, email, nickname);

        // 3) 토큰 생성 — 트랜잭션 밖
        User user = result.user();
        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());

        return new TokenResponse(accessToken, refreshToken,
                user.getId(), user.getNickname(), result.isNew());
    }

    /**
     * Refresh Token으로 새 Access Token을 발급한다.
     *
     * @param refreshToken JWT Refresh Token
     * @return 새 JWT 토큰 응답
     * @throws IllegalArgumentException 유효하지 않은 토큰 또는 Refresh Token이 아닌 경우
     * @throws EntityNotFoundException  사용자가 존재하지 않는 경우
     */
    @Transactional(readOnly = true)
    public TokenResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않은 Refresh Token입니다.");
        }

        if (!"REFRESH".equals(jwtTokenProvider.getTokenType(refreshToken))) {
            throw new IllegalArgumentException("Refresh Token이 아닙니다.");
        }

        Long userId = jwtTokenProvider.getUserId(refreshToken);
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new EntityNotFoundException("AUTH_001", "사용자를 찾을 수 없습니다."));

        String newAccessToken = jwtTokenProvider.createAccessToken(userId);
        String newRefreshToken = jwtTokenProvider.createRefreshToken(userId);

        return new TokenResponse(newAccessToken, newRefreshToken, user.getId(), user.getNickname(), false);
    }
}
