package com.brainquest.quest.ai;

import com.brainquest.common.exception.RateLimitExceededException;
import com.brainquest.quest.ai.ClaudeApiClient.QuestGenerationResult;
import com.brainquest.quest.entity.QuestCategory;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ClaudeApiClient 단위 테스트")
class ClaudeApiClientTest {

    private ClaudeApiClient claudeApiClient;

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private WebClient webClient;

    @Mock
    private WebClient.RequestBodyUriSpec requestBodyUriSpec;

    @Mock
    private WebClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private WebClient.ResponseSpec responseSpec;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        claudeApiClient = new ClaudeApiClient(
                "test-api-key", "claude-sonnet-4-20250514", 1024, 30,
                redisTemplate, objectMapper);

        // 내부 WebClient를 mock으로 교체
        ReflectionTestUtils.setField(claudeApiClient, "webClient", webClient);
    }

    private String rateLimitKey(Long userId) {
        return "claude:ratelimit:" + userId + ":" + LocalDate.now();
    }

    // ──────────────────────────────────────────────
    // fallbackGenerateQuest
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("fallbackGenerateQuest")
    class FallbackGenerateQuest {

        @Test
        @DisplayName("기본 템플릿으로 퀘스트 생성")
        void returnsTemplate() {
            // when
            QuestGenerationResult result = claudeApiClient.fallbackGenerateQuest("빨래하기", 30);

            // then
            assertThat(result.questTitle()).isEqualTo("용사의 빨래하기 퀘스트");
            assertThat(result.questStory()).isEqualTo("이 퀘스트를 완수하면 왕국에 평화가 찾아올 것이다!");
            assertThat(result.checkpoints()).hasSize(1);
            assertThat(result.checkpoints().get(0).title()).isEqualTo("빨래하기");
            assertThat(result.checkpoints().get(0).estimatedMin()).isEqualTo(30);
        }
    }

    // ──────────────────────────────────────────────
    // generateQuestStory — Rate Limit
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("Rate Limiting")
    class RateLimiting {

        @Test
        @DisplayName("일일 한도 초과 — RateLimitExceededException")
        void exceedsLimit_throwsException() {
            // given — 30회 소진
            Long userId = 1L;
            given(valueOperations.get(rateLimitKey(userId))).willReturn("30");

            // when & then
            assertThatThrownBy(() -> claudeApiClient.generateQuestStory(
                    userId, "빨래하기", 30, QuestCategory.HOME))
                    .isInstanceOf(RateLimitExceededException.class)
                    .hasMessageContaining("한도");

            // WebClient 호출 없어야 함
            verify(webClient, never()).post();
        }

        @Test
        @DisplayName("한도 미달 — API 호출 진행")
        void underLimit_proceedsWithApiCall() {
            // given — 29회 사용
            Long userId = 1L;
            given(valueOperations.get(rateLimitKey(userId))).willReturn("29");

            // WebClient 체인 모킹
            setupWebClientMock(validApiResponse());

            // when
            QuestGenerationResult result = claudeApiClient.generateQuestStory(
                    userId, "빨래하기", 30, QuestCategory.HOME);

            // then
            assertThat(result).isNotNull();
            verify(webClient).post();
            verify(valueOperations).increment(rateLimitKey(userId));
        }

        @Test
        @DisplayName("첫 호출 (카운터 null) — 정상 진행")
        void firstCall_proceedsNormally() {
            // given — 카운터 없음
            Long userId = 1L;
            given(valueOperations.get(rateLimitKey(userId))).willReturn(null);

            setupWebClientMock(validApiResponse());

            // when
            QuestGenerationResult result = claudeApiClient.generateQuestStory(
                    userId, "빨래하기", 30, QuestCategory.HOME);

            // then
            assertThat(result).isNotNull();
            verify(valueOperations).increment(rateLimitKey(userId));
        }
    }

    // ──────────────────────────────────────────────
    // generateQuestStory — API 호출
    // ──────────────────────────────────────────────

    @Nested
    @DisplayName("generateQuestStory — API 호출")
    class GenerateQuestStory {

        @Test
        @DisplayName("정상 — Claude API 응답 파싱 성공")
        void success_parsesResponse() {
            // given
            Long userId = 1L;
            given(valueOperations.get(rateLimitKey(userId))).willReturn("0");
            setupWebClientMock(validApiResponse());

            // when
            QuestGenerationResult result = claudeApiClient.generateQuestStory(
                    userId, "빨래하기", 30, QuestCategory.HOME);

            // then
            assertThat(result.questTitle()).isEqualTo("세탁의 마법사");
            assertThat(result.questStory()).isEqualTo("어둠의 세탁물이 쌓여간다...");
            assertThat(result.checkpoints()).hasSize(2);
            assertThat(result.checkpoints().get(0).title()).isEqualTo("세탁기 돌리기");
            assertThat(result.checkpoints().get(0).estimatedMin()).isEqualTo(10);
            assertThat(result.checkpoints().get(1).title()).isEqualTo("건조하기");
        }

        @Test
        @DisplayName("API 4xx 오류 — 폴백으로 대체")
        void apiError_fallsBackToTemplate() {
            // given
            Long userId = 1L;
            given(valueOperations.get(rateLimitKey(userId))).willReturn("0");

            // WebClient가 예외 발생
            given(webClient.post()).willReturn(requestBodyUriSpec);
            given(requestBodyUriSpec.uri(anyString())).willReturn(requestBodyUriSpec);
            given(requestBodyUriSpec.bodyValue(any())).willReturn(requestHeadersSpec);
            given(requestHeadersSpec.retrieve()).willThrow(
                    WebClientResponseException.create(429, "Too Many Requests", null, null, null));

            // when
            QuestGenerationResult result = claudeApiClient.generateQuestStory(
                    userId, "빨래하기", 30, QuestCategory.HOME);

            // then — 폴백 결과
            assertThat(result.questTitle()).isEqualTo("용사의 빨래하기 퀘스트");
            assertThat(result.questStory()).contains("왕국에 평화가");
            assertThat(result.checkpoints()).hasSize(1);
        }

        @Test
        @DisplayName("일반 예외 — 폴백으로 대체")
        void generalException_fallsBackToTemplate() {
            // given
            Long userId = 1L;
            given(valueOperations.get(rateLimitKey(userId))).willReturn("0");

            given(webClient.post()).willReturn(requestBodyUriSpec);
            given(requestBodyUriSpec.uri(anyString())).willReturn(requestBodyUriSpec);
            given(requestBodyUriSpec.bodyValue(any())).willReturn(requestHeadersSpec);
            given(requestHeadersSpec.retrieve()).willThrow(new RuntimeException("Connection refused"));

            // when
            QuestGenerationResult result = claudeApiClient.generateQuestStory(
                    userId, "청소하기", 60, QuestCategory.HOME);

            // then — 폴백 결과
            assertThat(result.questTitle()).isEqualTo("용사의 청소하기 퀘스트");
        }

        @Test
        @DisplayName("API 성공 후 Rate Limit 카운터 증가")
        void success_incrementsRateLimit() {
            // given
            Long userId = 1L;
            given(valueOperations.get(rateLimitKey(userId))).willReturn("5");
            setupWebClientMock(validApiResponse());

            // when
            claudeApiClient.generateQuestStory(userId, "빨래하기", 30, QuestCategory.HOME);

            // then
            verify(valueOperations).increment(rateLimitKey(userId));
            verify(redisTemplate).expire(eq(rateLimitKey(userId)), any());
        }

        @Test
        @DisplayName("API 실패 시 Rate Limit 카운터 증가하지 않음")
        void apiFailure_doesNotIncrementRateLimit() {
            // given
            Long userId = 1L;
            given(valueOperations.get(rateLimitKey(userId))).willReturn("5");

            given(webClient.post()).willReturn(requestBodyUriSpec);
            given(requestBodyUriSpec.uri(anyString())).willReturn(requestBodyUriSpec);
            given(requestBodyUriSpec.bodyValue(any())).willReturn(requestHeadersSpec);
            given(requestHeadersSpec.retrieve()).willThrow(new RuntimeException("fail"));

            // when
            claudeApiClient.generateQuestStory(userId, "빨래하기", 30, QuestCategory.HOME);

            // then — increment 호출 없음
            verify(valueOperations, never()).increment(anyString());
        }
    }

    // ── 헬퍼 ──

    @SuppressWarnings("unchecked")
    private void setupWebClientMock(String responseJson) {
        given(webClient.post()).willReturn(requestBodyUriSpec);
        given(requestBodyUriSpec.uri(anyString())).willReturn(requestBodyUriSpec);
        given(requestBodyUriSpec.bodyValue(any())).willReturn(requestHeadersSpec);
        given(requestHeadersSpec.retrieve()).willReturn(responseSpec);
        given(responseSpec.bodyToMono(String.class)).willReturn(Mono.just(responseJson));
    }

    private String validApiResponse() {
        return """
                {
                  "id": "msg_test",
                  "type": "message",
                  "role": "assistant",
                  "content": [
                    {
                      "type": "text",
                      "text": "{\\"questTitle\\":\\"세탁의 마법사\\",\\"questStory\\":\\"어둠의 세탁물이 쌓여간다...\\",\\"checkpoints\\":[{\\"title\\":\\"세탁기 돌리기\\",\\"estimatedMin\\":10},{\\"title\\":\\"건조하기\\",\\"estimatedMin\\":20}]}"
                    }
                  ]
                }
                """;
    }
}
