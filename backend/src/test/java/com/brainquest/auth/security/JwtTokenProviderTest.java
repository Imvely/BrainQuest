package com.brainquest.auth.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("JwtTokenProvider 단위 테스트")
class JwtTokenProviderTest {

    private JwtTokenProvider jwtTokenProvider;

    @BeforeEach
    void setUp() {
        jwtTokenProvider = new JwtTokenProvider();
        ReflectionTestUtils.setField(jwtTokenProvider, "secretKeyString",
                "TestSecretKeyForJwtTokenGenerationMustBeAtLeast256BitsLongForTesting!!");
        ReflectionTestUtils.setField(jwtTokenProvider, "accessExpiration", 900_000L);   // 15분
        ReflectionTestUtils.setField(jwtTokenProvider, "refreshExpiration", 2_592_000_000L); // 30일
        jwtTokenProvider.init();
    }

    @Nested
    @DisplayName("createAccessToken")
    class CreateAccessToken {

        @Test
        @DisplayName("유효한 Access Token 생성")
        void createsValidAccessToken() {
            String token = jwtTokenProvider.createAccessToken(1L);

            assertThat(token).isNotBlank();
            assertThat(jwtTokenProvider.validateToken(token)).isTrue();
            assertThat(jwtTokenProvider.getUserId(token)).isEqualTo(1L);
        }
    }

    @Nested
    @DisplayName("createRefreshToken")
    class CreateRefreshToken {

        @Test
        @DisplayName("유효한 Refresh Token 생성")
        void createsValidRefreshToken() {
            String token = jwtTokenProvider.createRefreshToken(42L);

            assertThat(token).isNotBlank();
            assertThat(jwtTokenProvider.validateToken(token)).isTrue();
            assertThat(jwtTokenProvider.getUserId(token)).isEqualTo(42L);
        }
    }

    @Nested
    @DisplayName("getUserId")
    class GetUserId {

        @Test
        @DisplayName("토큰에서 userId를 정확히 추출")
        void extractsUserIdCorrectly() {
            String token = jwtTokenProvider.createAccessToken(777L);

            assertThat(jwtTokenProvider.getUserId(token)).isEqualTo(777L);
        }
    }

    @Nested
    @DisplayName("validateToken")
    class ValidateToken {

        @Test
        @DisplayName("정상 토큰 — true")
        void validToken_returnsTrue() {
            String token = jwtTokenProvider.createAccessToken(1L);

            assertThat(jwtTokenProvider.validateToken(token)).isTrue();
        }

        @Test
        @DisplayName("변조된 토큰 — false")
        void tamperedToken_returnsFalse() {
            String token = jwtTokenProvider.createAccessToken(1L);
            String tampered = token.substring(0, token.length() - 5) + "XXXXX";

            assertThat(jwtTokenProvider.validateToken(tampered)).isFalse();
        }

        @Test
        @DisplayName("빈 문자열 토큰 — false")
        void emptyToken_returnsFalse() {
            assertThat(jwtTokenProvider.validateToken("")).isFalse();
        }

        @Test
        @DisplayName("잘못된 형식 토큰 — false")
        void malformedToken_returnsFalse() {
            assertThat(jwtTokenProvider.validateToken("not.a.jwt")).isFalse();
        }

        @Test
        @DisplayName("만료된 토큰 — false")
        void expiredToken_returnsFalse() {
            // 만료 시간을 0ms로 설정한 별도 provider 생성
            JwtTokenProvider shortLivedProvider = new JwtTokenProvider();
            ReflectionTestUtils.setField(shortLivedProvider, "secretKeyString",
                    "TestSecretKeyForJwtTokenGenerationMustBeAtLeast256BitsLongForTesting!!");
            ReflectionTestUtils.setField(shortLivedProvider, "accessExpiration", 0L);
            ReflectionTestUtils.setField(shortLivedProvider, "refreshExpiration", 0L);
            shortLivedProvider.init();

            String token = shortLivedProvider.createAccessToken(1L);

            assertThat(jwtTokenProvider.validateToken(token)).isFalse();
        }

        @Test
        @DisplayName("다른 키로 서명된 토큰 — false")
        void differentKey_returnsFalse() {
            JwtTokenProvider otherProvider = new JwtTokenProvider();
            ReflectionTestUtils.setField(otherProvider, "secretKeyString",
                    "AnotherSecretKeyThatIsDifferentFromTheOriginalAndMustBeAtLeast256Bits!!");
            ReflectionTestUtils.setField(otherProvider, "accessExpiration", 900_000L);
            ReflectionTestUtils.setField(otherProvider, "refreshExpiration", 2_592_000_000L);
            otherProvider.init();

            String token = otherProvider.createAccessToken(1L);

            assertThat(jwtTokenProvider.validateToken(token)).isFalse();
        }
    }

    @Nested
    @DisplayName("getTokenType")
    class GetTokenType {

        @Test
        @DisplayName("Access Token — 'ACCESS' 반환")
        void accessToken_returnsACCESS() {
            String token = jwtTokenProvider.createAccessToken(1L);

            assertThat(jwtTokenProvider.getTokenType(token)).isEqualTo("ACCESS");
        }

        @Test
        @DisplayName("Refresh Token — 'REFRESH' 반환")
        void refreshToken_returnsREFRESH() {
            String token = jwtTokenProvider.createRefreshToken(1L);

            assertThat(jwtTokenProvider.getTokenType(token)).isEqualTo("REFRESH");
        }
    }

    @Nested
    @DisplayName("init — 키 길이 검증")
    class Init {

        @Test
        @DisplayName("32바이트 미만 키 — IllegalStateException")
        void shortKey_throwsIllegalState() {
            JwtTokenProvider provider = new JwtTokenProvider();
            ReflectionTestUtils.setField(provider, "secretKeyString", "short-key");
            ReflectionTestUtils.setField(provider, "accessExpiration", 900_000L);
            ReflectionTestUtils.setField(provider, "refreshExpiration", 2_592_000_000L);

            assertThatThrownBy(provider::init)
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("at least 32 bytes");
        }
    }
}
