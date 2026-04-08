package com.brainquest.auth.service;

import com.brainquest.common.exception.UnauthorizedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * 소셜 로그인 서비스.
 * <p>소셜 로그인 제공자(카카오, 구글, 애플)의 토큰을 검증하고 사용자 프로필을 조회한다.
 * MVP에서는 카카오 REST API 연동만 구현하며, 나머지는 단계적으로 추가한다.</p>
 */
@Slf4j
@Service
public class SocialLoginService {

    private static final String KAKAO_USER_INFO_URL = "https://kapi.kakao.com/v2/user/me";
    private static final int TIMEOUT_MS = 5_000;

    private final RestTemplate restTemplate;

    public SocialLoginService() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(TIMEOUT_MS);
        factory.setReadTimeout(TIMEOUT_MS);
        this.restTemplate = new RestTemplate(factory);
    }

    /**
     * 소셜 토큰으로 사용자 프로필 정보를 조회한다.
     *
     * @param provider    소셜 로그인 제공자 (KAKAO, GOOGLE, APPLE)
     * @param accessToken 소셜 액세스 토큰
     * @return 사용자 프로필 정보 (id, email, nickname)
     * @throws UnauthorizedException    소셜 토큰이 유효하지 않은 경우
     * @throws IllegalArgumentException 지원하지 않는 provider인 경우
     */
    public Map<String, String> getUserProfile(String provider, String accessToken) {
        return switch (provider.toUpperCase()) {
            case "KAKAO" -> getKakaoProfile(accessToken);
            default -> throw new IllegalArgumentException("지원하지 않는 소셜 로그인 제공자입니다: " + provider);
        };
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> getKakaoProfile(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        Map<String, Object> body;
        try {
            var response = restTemplate.exchange(
                    KAKAO_USER_INFO_URL, HttpMethod.GET, entity, Map.class);
            body = response.getBody();
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new UnauthorizedException("AUTH_002", "카카오 액세스 토큰이 유효하지 않습니다.");
        } catch (RestClientException e) {
            log.error("카카오 API 호출 실패: {}", e.getMessage());
            throw new IllegalStateException("소셜 로그인 서비스에 연결할 수 없습니다.");
        }

        if (body == null) {
            throw new IllegalStateException("카카오 사용자 정보 조회 실패");
        }

        String id = String.valueOf(body.get("id"));

        Map<String, Object> kakaoAccount = (Map<String, Object>) body.getOrDefault("kakao_account", Map.of());
        String email = (String) kakaoAccount.get("email");

        Map<String, Object> profile = (Map<String, Object>) kakaoAccount.getOrDefault("profile", Map.of());
        String nickname = (String) profile.get("nickname");

        return Map.of(
                "id", id,
                "email", email != null ? email : "",
                "nickname", nickname != null ? nickname : "모험가"
        );
    }
}
