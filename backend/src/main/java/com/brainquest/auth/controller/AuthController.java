package com.brainquest.auth.controller;

import com.brainquest.auth.dto.LoginRequest;
import com.brainquest.auth.dto.RefreshRequest;
import com.brainquest.auth.dto.TokenResponse;
import com.brainquest.auth.service.AuthService;
import com.brainquest.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 인증 컨트롤러.
 * <p>소셜 로그인 및 토큰 갱신 API를 제공한다.</p>
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 소셜 로그인.
     * <p>소셜 로그인 제공자의 Access Token을 받아 JWT를 발급한다.</p>
     *
     * @param request 소셜 로그인 요청 (provider, accessToken)
     * @return JWT 토큰 응답
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<TokenResponse>> login(@Valid @RequestBody LoginRequest request) {
        TokenResponse tokenResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.of(tokenResponse, "로그인 성공"));
    }

    /**
     * 토큰 갱신.
     * <p>Refresh Token으로 새 Access Token을 발급한다.</p>
     *
     * @param request Refresh Token 요청
     * @return 새 JWT 토큰 응답
     */
    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<TokenResponse>> refresh(@Valid @RequestBody RefreshRequest request) {
        TokenResponse tokenResponse = authService.refreshToken(request.refreshToken());
        return ResponseEntity.ok(ApiResponse.of(tokenResponse, "토큰 갱신 성공"));
    }
}
