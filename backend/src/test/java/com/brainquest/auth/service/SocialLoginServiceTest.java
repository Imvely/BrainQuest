package com.brainquest.auth.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;

@ExtendWith(MockitoExtension.class)
@DisplayName("SocialLoginService 단위 테스트")
class SocialLoginServiceTest {

    @InjectMocks
    private SocialLoginService socialLoginService;

    @Mock
    private RestTemplate restTemplate;

    @Nested
    @DisplayName("getUserProfile — KAKAO")
    class KakaoProfile {

        @Test
        @DisplayName("정상 응답 — id, email, nickname 추출")
        @SuppressWarnings("unchecked")
        void validResponse_extractsProfile() {
            // given
            Map<String, Object> profile = Map.of("nickname", "카카오유저");
            Map<String, Object> kakaoAccount = Map.of("email", "user@kakao.com", "profile", profile);
            Map<String, Object> body = Map.of("id", 12345L, "kakao_account", kakaoAccount);

            given(restTemplate.exchange(
                    anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)
            )).willReturn(new ResponseEntity<>(body, HttpStatus.OK));

            // when — restTemplate이 Mock이지만, SocialLoginService 내부에서 직접 new RestTemplate()으로 생성하므로
            // Reflection으로 주입하거나, 여기서는 provider 분기 로직만 테스트
            // SocialLoginService의 restTemplate 필드를 Mock으로 교체
            org.springframework.test.util.ReflectionTestUtils.setField(
                    socialLoginService, "restTemplate", restTemplate);

            Map<String, String> result = socialLoginService.getUserProfile("KAKAO", "kakao-token");

            // then
            assertThat(result.get("id")).isEqualTo("12345");
            assertThat(result.get("email")).isEqualTo("user@kakao.com");
            assertThat(result.get("nickname")).isEqualTo("카카오유저");
        }

        @Test
        @DisplayName("email 없는 응답 — 빈 문자열로 처리")
        @SuppressWarnings("unchecked")
        void noEmail_returnsEmptyString() {
            // given
            Map<String, Object> profile = Map.of("nickname", "유저");
            Map<String, Object> kakaoAccount = Map.of("profile", profile);
            Map<String, Object> body = Map.of("id", 99999L, "kakao_account", kakaoAccount);

            given(restTemplate.exchange(
                    anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)
            )).willReturn(new ResponseEntity<>(body, HttpStatus.OK));

            org.springframework.test.util.ReflectionTestUtils.setField(
                    socialLoginService, "restTemplate", restTemplate);

            // when
            Map<String, String> result = socialLoginService.getUserProfile("KAKAO", "kakao-token");

            // then
            assertThat(result.get("email")).isEmpty();
        }

        @Test
        @DisplayName("nickname 없는 응답 — '모험가'로 처리")
        @SuppressWarnings("unchecked")
        void noNickname_returnsDefault() {
            // given
            Map<String, Object> kakaoAccount = Map.of("email", "user@kakao.com");
            Map<String, Object> body = Map.of("id", 11111L, "kakao_account", kakaoAccount);

            given(restTemplate.exchange(
                    anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)
            )).willReturn(new ResponseEntity<>(body, HttpStatus.OK));

            org.springframework.test.util.ReflectionTestUtils.setField(
                    socialLoginService, "restTemplate", restTemplate);

            // when
            Map<String, String> result = socialLoginService.getUserProfile("KAKAO", "kakao-token");

            // then
            assertThat(result.get("nickname")).isEqualTo("모험가");
        }

        @Test
        @DisplayName("응답 body가 null — IllegalStateException")
        @SuppressWarnings("unchecked")
        void nullBody_throwsIllegalState() {
            // given
            given(restTemplate.exchange(
                    anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)
            )).willReturn(new ResponseEntity<>(null, HttpStatus.OK));

            org.springframework.test.util.ReflectionTestUtils.setField(
                    socialLoginService, "restTemplate", restTemplate);

            // when & then
            assertThatThrownBy(() -> socialLoginService.getUserProfile("KAKAO", "kakao-token"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("카카오 사용자 정보 조회 실패");
        }

        @Test
        @DisplayName("카카오 토큰 만료/무효 — UnauthorizedException")
        @SuppressWarnings("unchecked")
        void invalidToken_throwsUnauthorized() {
            // given
            given(restTemplate.exchange(
                    anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)
            )).willThrow(HttpClientErrorException.Unauthorized.create(
                    HttpStatus.UNAUTHORIZED, "Unauthorized", null, null, null));

            org.springframework.test.util.ReflectionTestUtils.setField(
                    socialLoginService, "restTemplate", restTemplate);

            // when & then
            assertThatThrownBy(() -> socialLoginService.getUserProfile("KAKAO", "invalid-token"))
                    .isInstanceOf(com.brainquest.common.exception.UnauthorizedException.class)
                    .hasMessageContaining("카카오 액세스 토큰");
        }

        @Test
        @DisplayName("카카오 API 연결 실패 — IllegalStateException")
        @SuppressWarnings("unchecked")
        void connectionFailure_throwsIllegalState() {
            // given
            given(restTemplate.exchange(
                    anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)
            )).willThrow(new ResourceAccessException("Connection refused"));

            org.springframework.test.util.ReflectionTestUtils.setField(
                    socialLoginService, "restTemplate", restTemplate);

            // when & then
            assertThatThrownBy(() -> socialLoginService.getUserProfile("KAKAO", "some-token"))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("소셜 로그인 서비스에 연결할 수 없습니다");
        }
    }

    @Nested
    @DisplayName("getUserProfile — 지원하지 않는 provider")
    class UnsupportedProvider {

        @Test
        @DisplayName("NAVER 등 미지원 provider — IllegalArgumentException")
        void unsupportedProvider_throwsIllegalArgument() {
            assertThatThrownBy(() -> socialLoginService.getUserProfile("NAVER", "some-token"))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("지원하지 않는 소셜 로그인 제공자");
        }
    }
}
