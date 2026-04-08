package com.brainquest.auth.service;

import com.brainquest.auth.dto.LoginRequest;
import com.brainquest.auth.dto.TokenResponse;
import com.brainquest.auth.entity.User;
import com.brainquest.auth.repository.UserRepository;
import com.brainquest.auth.security.JwtTokenProvider;
import com.brainquest.common.exception.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService 단위 테스트")
class AuthServiceTest {

    @InjectMocks
    private AuthService authService;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtTokenProvider jwtTokenProvider;

    @Mock
    private SocialLoginService socialLoginService;

    @Mock
    private UserWriter userWriter;

    @Nested
    @DisplayName("login")
    class Login {

        @Test
        @DisplayName("신규 사용자 — 회원 가입 후 토큰 발급")
        void newUser_registersAndReturnsToken() {
            // given
            LoginRequest request = new LoginRequest("KAKAO", "kakao-access-token");
            Map<String, String> profile = Map.of("id", "12345", "email", "test@kakao.com", "nickname", "테스터");

            User savedUser = User.builder()
                    .email("test@kakao.com")
                    .nickname("테스터")
                    .provider("KAKAO")
                    .providerId("12345")
                    .build();

            given(socialLoginService.getUserProfile("KAKAO", "kakao-access-token")).willReturn(profile);
            given(userWriter.upsert(eq("KAKAO"), eq("12345"), eq("test@kakao.com"), eq("테스터")))
                    .willReturn(new UserWriter.UpsertResult(savedUser, true));
            given(jwtTokenProvider.createAccessToken(any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");

            // when
            TokenResponse response = authService.login(request);

            // then
            assertThat(response.isNewUser()).isTrue();
            assertThat(response.accessToken()).isEqualTo("access-token");
            assertThat(response.refreshToken()).isEqualTo("refresh-token");
            assertThat(response.nickname()).isEqualTo("테스터");
        }

        @Test
        @DisplayName("기존 사용자 — 프로필 업데이트 후 토큰 발급")
        void existingUser_updatesProfileAndReturnsToken() {
            // given
            LoginRequest request = new LoginRequest("KAKAO", "kakao-access-token");
            Map<String, String> profile = Map.of("id", "12345", "email", "new@kakao.com", "nickname", "새닉네임");

            User existingUser = User.builder()
                    .email("new@kakao.com")
                    .nickname("새닉네임")
                    .provider("KAKAO")
                    .providerId("12345")
                    .build();

            given(socialLoginService.getUserProfile("KAKAO", "kakao-access-token")).willReturn(profile);
            given(userWriter.upsert(eq("KAKAO"), eq("12345"), eq("new@kakao.com"), eq("새닉네임")))
                    .willReturn(new UserWriter.UpsertResult(existingUser, false));
            given(jwtTokenProvider.createAccessToken(any())).willReturn("access-token");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("refresh-token");

            // when
            TokenResponse response = authService.login(request);

            // then
            assertThat(response.isNewUser()).isFalse();
            assertThat(response.nickname()).isEqualTo("새닉네임");
        }

        @Test
        @DisplayName("닉네임 없는 소셜 프로필 — 기본 닉네임 '모험가'로 가입")
        void noNickname_usesDefaultNickname() {
            // given
            LoginRequest request = new LoginRequest("KAKAO", "kakao-access-token");
            Map<String, String> profile = Map.of("id", "99999", "email", "", "nickname", "모험가");

            User user = User.builder()
                    .email("")
                    .nickname("모험가")
                    .provider("KAKAO")
                    .providerId("99999")
                    .build();

            given(socialLoginService.getUserProfile("KAKAO", "kakao-access-token")).willReturn(profile);
            given(userWriter.upsert(eq("KAKAO"), eq("99999"), eq(""), eq("모험가")))
                    .willReturn(new UserWriter.UpsertResult(user, true));
            given(jwtTokenProvider.createAccessToken(any())).willReturn("at");
            given(jwtTokenProvider.createRefreshToken(any())).willReturn("rt");

            // when
            TokenResponse response = authService.login(request);

            // then
            assertThat(response.nickname()).isEqualTo("모험가");
        }
    }

    @Nested
    @DisplayName("refreshToken")
    class RefreshToken {

        @Test
        @DisplayName("유효한 Refresh Token — 새 토큰 발급")
        void validToken_returnsNewTokens() {
            // given
            User user = User.builder()
                    .email("test@kakao.com")
                    .nickname("테스터")
                    .provider("KAKAO")
                    .providerId("12345")
                    .build();

            given(jwtTokenProvider.validateToken("valid-refresh")).willReturn(true);
            given(jwtTokenProvider.getTokenType("valid-refresh")).willReturn("REFRESH");
            given(jwtTokenProvider.getUserId("valid-refresh")).willReturn(1L);
            given(userRepository.findById(1L)).willReturn(Optional.of(user));
            given(jwtTokenProvider.createAccessToken(1L)).willReturn("new-access");
            given(jwtTokenProvider.createRefreshToken(1L)).willReturn("new-refresh");

            // when
            TokenResponse response = authService.refreshToken("valid-refresh");

            // then
            assertThat(response.accessToken()).isEqualTo("new-access");
            assertThat(response.refreshToken()).isEqualTo("new-refresh");
            assertThat(response.isNewUser()).isFalse();
        }

        @Test
        @DisplayName("만료된 Refresh Token — IllegalArgumentException")
        void expiredToken_throwsIllegalArgument() {
            // given
            given(jwtTokenProvider.validateToken("expired-refresh")).willReturn(false);

            // when & then
            assertThatThrownBy(() -> authService.refreshToken("expired-refresh"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("유효하지 않은 Refresh Token입니다.");

            verify(userRepository, never()).findById(anyLong());
        }

        @Test
        @DisplayName("Access Token으로 갱신 시도 — IllegalArgumentException")
        void accessTokenUsedAsRefresh_throwsIllegalArgument() {
            // given
            given(jwtTokenProvider.validateToken("access-token")).willReturn(true);
            given(jwtTokenProvider.getTokenType("access-token")).willReturn("ACCESS");

            // when & then
            assertThatThrownBy(() -> authService.refreshToken("access-token"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Refresh Token이 아닙니다.");

            verify(userRepository, never()).findById(anyLong());
        }

        @Test
        @DisplayName("존재하지 않는 사용자 — EntityNotFoundException")
        void userNotFound_throwsEntityNotFound() {
            // given
            given(jwtTokenProvider.validateToken("valid-refresh")).willReturn(true);
            given(jwtTokenProvider.getTokenType("valid-refresh")).willReturn("REFRESH");
            given(jwtTokenProvider.getUserId("valid-refresh")).willReturn(999L);
            given(userRepository.findById(999L)).willReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> authService.refreshToken("valid-refresh"))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }
}
