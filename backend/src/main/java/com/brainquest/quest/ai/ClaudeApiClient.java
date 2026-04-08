package com.brainquest.quest.ai;

import com.brainquest.common.exception.RateLimitExceededException;
import com.brainquest.quest.entity.QuestCategory;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * Claude API 클라이언트.
 * <p>할 일을 RPG 퀘스트로 변환하기 위해 Anthropic Messages API를 호출한다.</p>
 */
@Slf4j
@Component
public class ClaudeApiClient {

    private static final String SYSTEM_PROMPT = """
            당신은 ADHD 사용자의 할 일을 판타지 RPG 퀘스트로 변환하는 AI입니다.
            반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
            {
              "questTitle": "RPG 스타일 퀘스트 제목",
              "questStory": "2~3문장의 재미있는 퀘스트 배경 스토리",
              "checkpoints": [
                {"title": "체크포인트 제목", "estimatedMin": 예상시간(분)}
              ]
            }
            체크포인트는 2~5개로 분해해주세요. 각 체크포인트는 구체적인 행동이어야 합니다.""";

    private static final int MAX_DAILY_CALLS = 30;

    private final WebClient webClient;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final String model;
    private final int maxTokens;
    private final int timeoutSec;

    public ClaudeApiClient(
            @Value("${claude.api-key:}") String apiKey,
            @Value("${claude.model:claude-sonnet-4-20250514}") String model,
            @Value("${claude.max-tokens:1024}") int maxTokens,
            @Value("${claude.timeout:30}") int timeoutSec,
            StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper) {
        this.model = model;
        this.maxTokens = maxTokens;
        this.timeoutSec = timeoutSec;
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
                .baseUrl("https://api.anthropic.com")
                .defaultHeader("x-api-key", apiKey)
                .defaultHeader("anthropic-version", "2023-06-01")
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Claude API를 호출하여 퀘스트 스토리를 생성한다.
     *
     * @return 파싱된 QuestGenerationResult (questTitle, questStory, checkpoints)
     */
    public QuestGenerationResult generateQuestStory(Long userId, String originalTitle,
                                                    int estimatedMin, QuestCategory category) {
        checkRateLimit(userId);

        String userPrompt = "할 일: %s\n예상 소요 시간: %d분\n카테고리: %s"
                .formatted(originalTitle, estimatedMin, category.name());

        Map<String, Object> requestBody = Map.of(
                "model", model,
                "max_tokens", maxTokens,
                "system", SYSTEM_PROMPT,
                "messages", List.of(Map.of("role", "user", "content", userPrompt))
        );

        try {
            String responseBody = webClient.post()
                    .uri("/v1/messages")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofSeconds(timeoutSec))
                    .block();

            incrementRateLimit(userId);
            return parseResponse(responseBody);

        } catch (WebClientResponseException e) {
            log.error("Claude API 호출 실패: status={}, body={}", e.getStatusCode(), e.getResponseBodyAsString());
            return fallbackGenerateQuest(originalTitle, estimatedMin);
        } catch (Exception e) {
            log.error("Claude API 호출 중 오류 발생", e);
            return fallbackGenerateQuest(originalTitle, estimatedMin);
        }
    }

    /**
     * AI 없이 기본 템플릿을 적용하는 폴백.
     */
    public QuestGenerationResult fallbackGenerateQuest(String originalTitle, int estimatedMin) {
        log.info("폴백 퀘스트 생성: {}", originalTitle);
        return new QuestGenerationResult(
                "용사의 " + originalTitle + " 퀘스트",
                "이 퀘스트를 완수하면 왕국에 평화가 찾아올 것이다!",
                List.of(new QuestGenerationResult.CheckpointData(originalTitle, estimatedMin))
        );
    }

    // ── private helpers ──

    private void checkRateLimit(Long userId) {
        String key = "claude:ratelimit:" + userId + ":" + LocalDate.now();
        String countStr = redisTemplate.opsForValue().get(key);
        int count = countStr != null ? Integer.parseInt(countStr) : 0;
        if (count >= MAX_DAILY_CALLS) {
            throw new RateLimitExceededException("QUEST_001",
                    "일일 AI 퀘스트 생성 한도(%d회)를 초과했습니다.".formatted(MAX_DAILY_CALLS));
        }
    }

    private void incrementRateLimit(Long userId) {
        String key = "claude:ratelimit:" + userId + ":" + LocalDate.now();
        redisTemplate.opsForValue().increment(key);
        redisTemplate.expire(key, Duration.ofHours(24));
    }

    private QuestGenerationResult parseResponse(String responseBody) throws JsonProcessingException {
        var root = objectMapper.readTree(responseBody);
        var contentArray = root.get("content");
        if (contentArray == null || !contentArray.isArray() || contentArray.isEmpty()) {
            throw new IllegalStateException("Claude API 응답에 content가 없습니다.");
        }

        var textNode = contentArray.get(0).get("text");
        if (textNode == null) {
            throw new IllegalStateException("Claude API 응답의 content[0]에 text 필드가 없습니다.");
        }
        return objectMapper.readValue(textNode.asText(), QuestGenerationResult.class);
    }

    /**
     * Claude API 응답을 파싱한 결과.
     */
    public record QuestGenerationResult(
            @JsonProperty("questTitle") String questTitle,
            @JsonProperty("questStory") String questStory,
            @JsonProperty("checkpoints") List<CheckpointData> checkpoints
    ) {
        public record CheckpointData(
                @JsonProperty("title") String title,
                @JsonProperty("estimatedMin") int estimatedMin
        ) {
        }
    }
}
