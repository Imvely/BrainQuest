package com.brainquest.auth.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 토큰 생성 및 검증을 담당한다.
 * <p>Access Token(15분)과 Refresh Token(30일)을 HS256 알고리즘으로 서명한다.</p>
 */
@Slf4j
@Component
public class JwtTokenProvider {

    private static final int MIN_SECRET_KEY_BYTES = 32;

    @Value("${jwt.secret-key}")
    private String secretKeyString;

    @Value("${jwt.access-expiration}")
    private long accessExpiration;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpiration;

    private SecretKey secretKey;

    @PostConstruct
    public void init() {
        byte[] keyBytes = secretKeyString.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < MIN_SECRET_KEY_BYTES) {
            throw new IllegalStateException(
                    "JWT secret key must be at least " + MIN_SECRET_KEY_BYTES + " bytes for HS256");
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Access Token을 생성한다.
     *
     * @param userId 사용자 ID
     * @return JWT Access Token 문자열
     */
    public String createAccessToken(Long userId) {
        return createToken(userId, accessExpiration, "ACCESS");
    }

    /**
     * Refresh Token을 생성한다.
     *
     * @param userId 사용자 ID
     * @return JWT Refresh Token 문자열
     */
    public String createRefreshToken(Long userId) {
        return createToken(userId, refreshExpiration, "REFRESH");
    }

    /**
     * 토큰에서 사용자 ID를 추출한다.
     *
     * @param token JWT 토큰
     * @return 사용자 ID
     */
    public Long getUserId(String token) {
        return parseClaims(token).get("userId", Long.class);
    }

    /**
     * 토큰에서 타입(ACCESS / REFRESH)을 추출한다.
     *
     * @param token JWT 토큰
     * @return 토큰 타입 문자열
     */
    public String getTokenType(String token) {
        return parseClaims(token).get("type", String.class);
    }

    /**
     * 토큰의 유효성을 검증한다.
     *
     * @param token JWT 토큰
     * @return 유효하면 true
     */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT token expired");
        } catch (JwtException e) {
            log.warn("Invalid JWT token: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT token is empty or null");
        }
        return false;
    }

    private String createToken(Long userId, long expiration, String type) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .claim("userId", userId)
                .claim("type", type)
                .issuedAt(now)
                .expiration(expiryDate)
                .signWith(secretKey)
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
