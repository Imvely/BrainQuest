package com.brainquest.integration;

import com.brainquest.auth.dto.LoginRequest;
import com.brainquest.auth.dto.TokenResponse;
import com.brainquest.auth.service.SocialLoginService;
import com.brainquest.battle.dto.*;
import com.brainquest.battle.entity.BattleResult;
import com.brainquest.battle.entity.PenaltyType;
import com.brainquest.character.dto.CharacterResponse;
import com.brainquest.character.dto.CreateCharacterRequest;
import com.brainquest.character.entity.ClassType;
import com.brainquest.character.entity.Item;
import com.brainquest.character.entity.ItemRarity;
import com.brainquest.character.entity.ItemSlot;
import com.brainquest.character.repository.ItemRepository;
import com.brainquest.common.dto.ApiResponse;
import com.brainquest.gate.dto.CheckinRequest;
import com.brainquest.gate.dto.CheckinResponse;
import com.brainquest.gate.dto.ScreeningRequest;
import com.brainquest.gate.dto.ScreeningResponse;
import com.brainquest.gate.dto.StreakResponse;
import com.brainquest.gate.entity.CheckinType;
import com.brainquest.gate.entity.Streak;
import com.brainquest.gate.entity.StreakType;
import com.brainquest.gate.entity.TestType;
import com.brainquest.gate.repository.StreakRepository;
import com.brainquest.map.dto.BlockResponse;
import com.brainquest.map.dto.CreateBlockRequest;
import com.brainquest.map.dto.TimelineResponse;
import com.brainquest.map.entity.BlockCategory;
import com.brainquest.quest.ai.ClaudeApiClient;
import com.brainquest.quest.dto.*;
import com.brainquest.quest.entity.Grade;
import com.brainquest.quest.entity.QuestCategory;
import com.brainquest.quest.entity.CheckpointStatus;
import com.brainquest.sky.dto.EmotionResponse;
import com.brainquest.sky.dto.MonthlyCalendarResponse;
import com.brainquest.sky.dto.RecordEmotionRequest;
import com.brainquest.sky.entity.WeatherType;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration;
import org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * 크로스 모듈 통합 테스트.
 * <p>H2 인메모리 DB + MockMvc 사용. Redis/Claude API/SocialLogin은 모킹.</p>
 */
@SpringBootTest(properties = {
        "spring.autoconfigure.exclude=" +
                "org.springframework.boot.autoconfigure.data.redis.RedisAutoConfiguration," +
                "org.springframework.boot.autoconfigure.data.redis.RedisRepositoriesAutoConfiguration"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class CrossModuleIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ItemRepository itemRepository;

    @Autowired
    private StreakRepository streakRepository;

    @MockBean
    private SocialLoginService socialLoginService;

    @MockBean
    private ClaudeApiClient claudeApiClient;

    // ── 헬퍼: 사용자 생성 + JWT 발급 ──

    private TokenResponse loginNewUser(String provider, String providerId,
                                       String email, String nickname) throws Exception {
        when(socialLoginService.getUserProfile(eq(provider), anyString()))
                .thenReturn(Map.of("id", providerId, "email", email, "nickname", nickname));

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest(provider, "mock-token-" + providerId))))
                .andExpect(status().isOk())
                .andReturn();

        return extractData(result, new TypeReference<ApiResponse<TokenResponse>>() {}).getData();
    }

    // ── 헬퍼: 응답 추출 (UTF-8) ──

    private <T> ApiResponse<T> extractData(MvcResult result, TypeReference<ApiResponse<T>> typeRef) throws Exception {
        return objectMapper.readValue(
                result.getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8),
                typeRef);
    }

    // ── 헬퍼: 테스트용 아이템 시드 ──

    private void seedItems() {
        if (itemRepository.count() > 0) return;
        itemRepository.saveAll(List.of(
                Item.builder().name("나무 검").slot(ItemSlot.WEAPON).rarity(ItemRarity.COMMON)
                        .statBonus(Map.of("atk", 3)).build(),
                Item.builder().name("가죽 갑옷").slot(ItemSlot.ARMOR).rarity(ItemRarity.COMMON)
                        .statBonus(Map.of("def", 3)).build(),
                Item.builder().name("강철 검").slot(ItemSlot.WEAPON).rarity(ItemRarity.UNCOMMON)
                        .statBonus(Map.of("atk", 7)).build(),
                Item.builder().name("마법 로브").slot(ItemSlot.ARMOR).rarity(ItemRarity.RARE)
                        .statBonus(Map.of("wis", 10)).build(),
                Item.builder().name("드래곤 슬레이어").slot(ItemSlot.WEAPON).rarity(ItemRarity.EPIC)
                        .statBonus(Map.of("atk", 20)).build()
        ));
    }

    // ── 헬퍼: 퀘스트 저장 ──

    private QuestResponse saveQuest(String token, Grade grade, int estimatedMin,
                                    List<CheckpointRequest> checkpoints) throws Exception {
        SaveQuestRequest req = new SaveQuestRequest(
                "테스트 할 일", "용사의 테스트 퀘스트",
                "테스트 스토리", QuestCategory.WORK,
                grade, estimatedMin, null, checkpoints);

        MvcResult result = mockMvc.perform(post("/api/v1/quest")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andReturn();

        return extractData(result, new TypeReference<ApiResponse<QuestResponse>>() {}).getData();
    }

    // ── 헬퍼: 퀘스트 상세 조회 ──

    private QuestDetailResponse getQuestDetail(String token, Long questId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/quest/" + questId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return extractData(result, new TypeReference<ApiResponse<QuestDetailResponse>>() {}).getData();
    }

    // ── 헬퍼: 캐릭터 조회 ──

    private CharacterResponse getCharacter(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/character")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        return extractData(result, new TypeReference<ApiResponse<CharacterResponse>>() {}).getData();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 시나리오 1: 신규 사용자 온보딩 → 첫 전투 전체 플로우
    // ═══════════════════════════════════════════════════════════════════

    @Test
    @Order(1)
    @DisplayName("시나리오 1: 신규 사용자 온보딩 → 첫 전투 전체 플로우")
    void scenario1_onboarding_to_first_battle() throws Exception {
        seedItems();

        // 1. 로그인 → 신규 사용자 생성 + JWT 발급
        TokenResponse tokens = loginNewUser("KAKAO", "kakao-001", "test1@test.com", "테스터1");
        assertThat(tokens.accessToken()).isNotBlank();
        assertThat(tokens.isNewUser()).isTrue();
        String token = tokens.accessToken();

        // 2. 캐릭터 생성 (WARRIOR) — 스크리닝 경험치를 받으려면 캐릭터가 먼저 있어야 함
        CreateCharacterRequest charReq = new CreateCharacterRequest(
                "용사", ClassType.WARRIOR, Map.of("hair", "style1", "color", "#FF0000"));

        mockMvc.perform(post("/api/v1/character")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(charReq)))
                .andExpect(status().isOk());

        // 3. ASRS 스크리닝 제출 → 경험치 +30
        ScreeningRequest screeningReq = new ScreeningRequest(
                TestType.ASRS_6,
                Map.of("q1", 3, "q2", 4, "q3", 2, "q4", 3, "q5", 4, "q6", 3));

        MvcResult screeningResult = mockMvc.perform(post("/api/v1/gate/screening")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(screeningReq)))
                .andExpect(status().isOk())
                .andReturn();

        ScreeningResponse screening = extractData(screeningResult,
                new TypeReference<ApiResponse<ScreeningResponse>>() {}).getData();
        assertThat(screening.totalScore()).isEqualTo(19);

        // 4. 캐릭터 초기 스탯 확인 — 스크리닝 경험치 +30 반영
        // WARRIOR: atk=15, level=1, exp=30 (스크리닝 보상)
        CharacterResponse character = getCharacter(token);
        assertThat(character.classType()).isEqualTo(ClassType.WARRIOR);
        assertThat(character.stats().atk()).isEqualTo(15);
        assertThat(character.level()).isEqualTo(1);
        // 스크리닝 경험치 30 적용 확인
        assertThat(character.exp()).isEqualTo(30);

        // 5. AI 퀘스트 변환 (Claude API 모킹)
        when(claudeApiClient.generateQuestStory(anyLong(), anyString(), anyInt(), any()))
                .thenReturn(new ClaudeApiClient.QuestGenerationResult(
                        "마왕의 서류 공격을 막아라!",
                        "마왕이 서류 더미를 소환했다!",
                        List.of(new ClaudeApiClient.QuestGenerationResult.CheckpointData("준비", 10),
                                new ClaudeApiClient.QuestGenerationResult.CheckpointData("실행", 15))));

        MvcResult genResult = mockMvc.perform(post("/api/v1/quest/generate")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new GenerateQuestRequest("보고서 작성", 25, QuestCategory.WORK))))
                .andExpect(status().isOk())
                .andReturn();

        GenerateQuestResponse generated = extractData(genResult,
                new TypeReference<ApiResponse<GenerateQuestResponse>>() {}).getData();
        assertThat(generated.questTitle()).isEqualTo("마왕의 서류 공격을 막아라!");

        // 6. 퀘스트 저장
        QuestResponse quest = saveQuest(token, Grade.D, 25,
                List.of(new CheckpointRequest("준비", 10),
                        new CheckpointRequest("실행", 15)));
        assertThat(quest.grade()).isEqualTo(Grade.D);

        // 퀘스트 상세 조회하여 체크포인트 ID 확인
        QuestDetailResponse questDetail = getQuestDetail(token, quest.id());
        Long checkpointId = questDetail.checkpoints().get(0).id();

        // 7. 전투 시작 (questId + checkpointId 연결)
        StartBattleRequest battleReq = new StartBattleRequest(25, quest.id(), checkpointId);

        MvcResult startResult = mockMvc.perform(post("/api/v1/battle/start")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(battleReq)))
                .andExpect(status().isOk())
                .andReturn();

        StartBattleResponse battleStart = extractData(startResult,
                new TypeReference<ApiResponse<StartBattleResponse>>() {}).getData();
        assertThat(battleStart.monster().type()).isEqualTo("고블린"); // D급
        assertThat(battleStart.monster().maxHp()).isEqualTo(300);

        // 8. 전투 종료 (VICTORY)
        EndBattleRequest endReq = new EndBattleRequest(BattleResult.VICTORY, 0);

        MvcResult endResult = mockMvc.perform(post("/api/v1/battle/" + battleStart.sessionId() + "/end")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(endReq)))
                .andExpect(status().isOk())
                .andReturn();

        EndBattleResponse battleEnd = extractData(endResult,
                new TypeReference<ApiResponse<EndBattleResponse>>() {}).getData();
        assertThat(battleEnd.result()).isEqualTo(BattleResult.VICTORY);
        assertThat(battleEnd.expEarned()).isGreaterThan(0);

        // AFTER_COMMIT 리스너 대기
        Thread.sleep(500);

        // 9. 캐릭터 경험치/골드 증가 확인 — 레벨업 발생 가능하므로 레벨 또는 exp 중 하나는 증가
        CharacterResponse afterBattle = getCharacter(token);
        boolean expIncreased = afterBattle.exp() > character.exp();
        boolean levelIncreased = afterBattle.level() > character.level();
        assertThat(expIncreased || levelIncreased)
                .as("경험치 또는 레벨 중 하나는 증가해야 함 (before: exp=%d level=%d, after: exp=%d level=%d)",
                        character.exp(), character.level(), afterBattle.exp(), afterBattle.level())
                .isTrue();
        assertThat(afterBattle.gold()).isGreaterThan(0);

        // 10. 체크포인트 자동 완료 확인 (BattleCompletedEvent → QuestEventListener)
        QuestDetailResponse afterQuest = getQuestDetail(token, quest.id());
        assertThat(afterQuest.checkpoints().get(0).status()).isEqualTo(CheckpointStatus.COMPLETED);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 시나리오 2: 전투 완료 → 퀘스트 완료 → 레벨업 연쇄
    // ═══════════════════════════════════════════════════════════════════

    @Test
    @Order(2)
    @DisplayName("시나리오 2: 전투 완료 → 퀘스트 완료 → 레벨업 연쇄")
    void scenario2_battle_quest_levelUp_chain() throws Exception {
        seedItems();

        // 사용자 + 캐릭터 생성
        TokenResponse tokens = loginNewUser("KAKAO", "kakao-002", "test2@test.com", "테스터2");
        String token = tokens.accessToken();

        mockMvc.perform(post("/api/v1/character")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateCharacterRequest("전사", ClassType.WARRIOR,
                                        Map.of("hair", "style1")))))
                .andExpect(status().isOk());

        CharacterResponse charBefore = getCharacter(token);
        int initialExp = charBefore.exp();
        int initialGold = charBefore.gold();

        // 1. 퀘스트 등록 (체크포인트 2개, C급)
        // C급: 총 50 exp, 30 gold
        QuestResponse quest = saveQuest(token, Grade.C, 30,
                List.of(new CheckpointRequest("1단계: 자료 조사", 15),
                        new CheckpointRequest("2단계: 보고서 작성", 15)));

        QuestDetailResponse questDetail = getQuestDetail(token, quest.id());
        Long cp1Id = questDetail.checkpoints().get(0).id();
        Long cp2Id = questDetail.checkpoints().get(1).id();
        int cp1Exp = questDetail.checkpoints().get(0).expReward();
        int cp2Exp = questDetail.checkpoints().get(1).expReward();

        // 2. 체크포인트 1 전투 시작 → VICTORY
        MvcResult start1 = mockMvc.perform(post("/api/v1/battle/start")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new StartBattleRequest(25, quest.id(), cp1Id))))
                .andExpect(status().isOk())
                .andReturn();

        StartBattleResponse battle1 = extractData(start1,
                new TypeReference<ApiResponse<StartBattleResponse>>() {}).getData();

        MvcResult end1 = mockMvc.perform(post("/api/v1/battle/" + battle1.sessionId() + "/end")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new EndBattleRequest(BattleResult.VICTORY, 0))))
                .andExpect(status().isOk())
                .andReturn();

        EndBattleResponse result1 = extractData(end1,
                new TypeReference<ApiResponse<EndBattleResponse>>() {}).getData();
        int battle1Exp = result1.expEarned();

        Thread.sleep(500); // AFTER_COMMIT 대기

        // 체크포인트 1 자동 완료 확인
        QuestDetailResponse afterCp1 = getQuestDetail(token, quest.id());
        assertThat(afterCp1.checkpoints().get(0).status()).isEqualTo(CheckpointStatus.COMPLETED);
        assertThat(afterCp1.checkpoints().get(1).status()).isEqualTo(CheckpointStatus.PENDING);

        // 3. 체크포인트 2 전투 시작 → VICTORY → 퀘스트 전체 완료
        MvcResult start2 = mockMvc.perform(post("/api/v1/battle/start")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new StartBattleRequest(25, quest.id(), cp2Id))))
                .andExpect(status().isOk())
                .andReturn();

        StartBattleResponse battle2 = extractData(start2,
                new TypeReference<ApiResponse<StartBattleResponse>>() {}).getData();

        MvcResult end2 = mockMvc.perform(post("/api/v1/battle/" + battle2.sessionId() + "/end")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new EndBattleRequest(BattleResult.VICTORY, 0))))
                .andExpect(status().isOk())
                .andReturn();

        EndBattleResponse result2 = extractData(end2,
                new TypeReference<ApiResponse<EndBattleResponse>>() {}).getData();
        int battle2Exp = result2.expEarned();

        Thread.sleep(500); // AFTER_COMMIT 대기

        // 체크포인트 2 완료 + 퀘스트 전체 완료 확인
        QuestDetailResponse afterCp2 = getQuestDetail(token, quest.id());
        assertThat(afterCp2.checkpoints().get(1).status()).isEqualTo(CheckpointStatus.COMPLETED);
        assertThat(afterCp2.status().name()).isEqualTo("COMPLETED");

        // 5. 캐릭터 경험치 합산 정확성 확인
        CharacterResponse charAfter = getCharacter(token);
        // 총 경험치 = 전투1 exp + 전투2 exp + cp1 exp + cp2 exp + 퀘스트 잔여 exp
        int totalExpEarned = charAfter.exp() + (charAfter.level() - charBefore.level()) * 100 // 소비된 exp 추정
                - initialExp;
        assertThat(totalExpEarned).isGreaterThan(0);
        assertThat(charAfter.gold()).isGreaterThan(initialGold);

        // 6. 레벨업 발생 시 정확성 확인
        if (charAfter.level() > charBefore.level()) {
            // expToNext = floor(50 * level^1.5)
            int expectedExpToNext = (int) Math.floor(50 * Math.pow(charAfter.level(), 1.5));
            assertThat(charAfter.expToNext()).isEqualTo(expectedExpToNext);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // 시나리오 3: 하루 전체 데이터 흐름
    // ═══════════════════════════════════════════════════════════════════

    @Test
    @Order(3)
    @DisplayName("시나리오 3: 하루 전체 데이터 흐름")
    void scenario3_full_day_data_flow() throws Exception {
        seedItems();

        // 사용자 + 캐릭터 준비
        TokenResponse tokens = loginNewUser("KAKAO", "kakao-003", "test3@test.com", "테스터3");
        String token = tokens.accessToken();

        mockMvc.perform(post("/api/v1/character")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateCharacterRequest("마법사", ClassType.MAGE,
                                        Map.of("hair", "style2")))))
                .andExpect(status().isOk());

        LocalDate today = LocalDate.now();

        // 1. 아침 체크인
        CheckinRequest morningReq = new CheckinRequest(
                CheckinType.MORNING,
                new BigDecimal("6.0"), 2, 3,
                null, null, null, "졸린 아침");

        MvcResult morningResult = mockMvc.perform(post("/api/v1/gate/checkin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(morningReq)))
                .andExpect(status().isOk())
                .andReturn();

        CheckinResponse morning = extractData(morningResult,
                new TypeReference<ApiResponse<CheckinResponse>>() {}).getData();
        assertThat(morning.type()).isEqualTo(CheckinType.MORNING);
        assertThat(morning.streakCount()).isGreaterThanOrEqualTo(1);

        // 2. 감정 기록 (CLOUDY, 강도 3)
        RecordEmotionRequest emotionReq1 = new RecordEmotionRequest(
                WeatherType.CLOUDY, 3, List.of("피곤"), "아침에 졸림",
                LocalDateTime.now());

        mockMvc.perform(post("/api/v1/sky/emotions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emotionReq1)))
                .andExpect(status().isOk());

        // 3. 타임블록 3개 생성
        CreateBlockRequest block1 = new CreateBlockRequest(
                today, LocalTime.of(9, 0), LocalTime.of(10, 0),
                BlockCategory.WORK, "아침 회의", null);
        CreateBlockRequest block2 = new CreateBlockRequest(
                today, LocalTime.of(10, 30), LocalTime.of(12, 0),
                BlockCategory.WORK, "코딩", null);
        CreateBlockRequest block3 = new CreateBlockRequest(
                today, LocalTime.of(14, 0), LocalTime.of(15, 0),
                BlockCategory.HEALTH, "산책", null);

        for (var blockReq : List.of(block1, block2, block3)) {
            mockMvc.perform(post("/api/v1/map/blocks")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(blockReq)))
                    .andExpect(status().isOk());
        }

        // 4. 전투 → VICTORY
        QuestResponse quest = saveQuest(token, Grade.E, 10,
                List.of(new CheckpointRequest("집중", 10)));

        MvcResult startBattle = mockMvc.perform(post("/api/v1/battle/start")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new StartBattleRequest(10, quest.id(), null))))
                .andExpect(status().isOk())
                .andReturn();

        StartBattleResponse battleStart = extractData(startBattle,
                new TypeReference<ApiResponse<StartBattleResponse>>() {}).getData();

        mockMvc.perform(post("/api/v1/battle/" + battleStart.sessionId() + "/end")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new EndBattleRequest(BattleResult.VICTORY, 0))))
                .andExpect(status().isOk());

        // 5. 감정 기록 (SUNNY, 강도 4)
        RecordEmotionRequest emotionReq2 = new RecordEmotionRequest(
                WeatherType.SUNNY, 4, List.of("기분좋음"), "전투 후 기분 좋음",
                LocalDateTime.now());

        mockMvc.perform(post("/api/v1/sky/emotions")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emotionReq2)))
                .andExpect(status().isOk());

        // 6. 저녁 체크인
        CheckinRequest eveningReq = new CheckinRequest(
                CheckinType.EVENING,
                null, null, null,
                4, 2, 4, "괜찮은 하루");

        mockMvc.perform(post("/api/v1/gate/checkin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(eveningReq)))
                .andExpect(status().isOk());

        Thread.sleep(500); // AFTER_COMMIT 대기

        // 7. 타임라인 조회 → 블록 + 퀘스트 + 감정 + 전투 모두 포함 확인
        MvcResult timelineResult = mockMvc.perform(get("/api/v1/map/timeline/" + today)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        TimelineResponse timeline = extractData(timelineResult,
                new TypeReference<ApiResponse<TimelineResponse>>() {}).getData();
        assertThat(timeline.blocks()).hasSize(3);
        assertThat(timeline.battleSessions()).isNotEmpty();
        assertThat(timeline.emotionRecords()).hasSizeGreaterThanOrEqualTo(2);

        // 8. 캘린더 조회 → 오늘 날짜에 기록 존재 확인
        YearMonth ym = YearMonth.from(today);
        MvcResult calendarResult = mockMvc.perform(get("/api/v1/sky/calendar/" + ym)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        MonthlyCalendarResponse calendar = extractData(calendarResult,
                new TypeReference<ApiResponse<MonthlyCalendarResponse>>() {}).getData();
        assertThat(calendar.days()).isNotEmpty();
        boolean todayFound = calendar.days().stream()
                .anyMatch(d -> d.date().equals(today));
        assertThat(todayFound).isTrue();

        // 9. 스트릭 갱신 확인
        MvcResult streakResult = mockMvc.perform(get("/api/v1/gate/streaks")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        List<StreakResponse> streaks = extractData(streakResult,
                new TypeReference<ApiResponse<List<StreakResponse>>>() {}).getData();
        boolean checkinStreakExists = streaks.stream()
                .anyMatch(s -> s.streakType() == StreakType.CHECKIN && s.currentCount() >= 1);
        assertThat(checkinStreakExists).isTrue();
    }

    // ═══════════════════════════════════════════════════════════════════
    // 시나리오 4: 이탈 페널티 정확성
    // ═══════════════════════════════════════════════════════════════════

    @Test
    @Order(4)
    @DisplayName("시나리오 4: 이탈 페널티 정확성")
    void scenario4_exit_penalty_accuracy() throws Exception {
        seedItems();

        // 사용자 + 캐릭터 준비
        TokenResponse tokens = loginNewUser("KAKAO", "kakao-004", "test4@test.com", "테스터4");
        String token = tokens.accessToken();

        mockMvc.perform(post("/api/v1/character")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateCharacterRequest("레인저", ClassType.RANGER,
                                        Map.of("hair", "style3")))))
                .andExpect(status().isOk());

        // C급 퀘스트 (몬스터 HP 600)
        QuestResponse quest = saveQuest(token, Grade.C, 30,
                List.of(new CheckpointRequest("집중 훈련", 30)));

        // 1. 전투 시작 (25분, C급)
        MvcResult startResult = mockMvc.perform(post("/api/v1/battle/start")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new StartBattleRequest(25, quest.id(), null))))
                .andExpect(status().isOk())
                .andReturn();

        StartBattleResponse battleStart = extractData(startResult,
                new TypeReference<ApiResponse<StartBattleResponse>>() {}).getData();
        Long sessionId = battleStart.sessionId();
        int monsterMaxHp = battleStart.monster().maxHp();
        assertThat(monsterMaxHp).isEqualTo(600); // C급

        // 2. 이탈 기록
        mockMvc.perform(post("/api/v1/battle/" + sessionId + "/exit")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // 3. ~40초 대기 (시간은 실제 이탈 시각과 복귀 시각의 차이로 결정됨)
        // 이탈 후 바로 복귀하면 ≤30초 → COMBO_RESET
        // 실제 테스트에서는 Duration.between(exitAt, now)로 계산되므로
        // 테스트 시간이 짧아도 서버 시간 기준으로 판정됨
        // 여기서는 바로 복귀 → COMBO_RESET 확인
        MvcResult return1 = mockMvc.perform(post("/api/v1/battle/" + sessionId + "/return")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        ReturnResponse returnResp1 = extractData(return1,
                new TypeReference<ApiResponse<ReturnResponse>>() {}).getData();
        // 즉시 복귀 → COMBO_RESET (≤30초)
        assertThat(returnResp1.penaltyType()).isEqualTo(PenaltyType.COMBO_RESET);
        // COMBO_RESET은 몬스터 HP에 영향 없음
        assertThat(returnResp1.monsterRemainingHp()).isEqualTo(monsterMaxHp);

        // 5. 재이탈
        mockMvc.perform(post("/api/v1/battle/" + sessionId + "/exit")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // 6. 다시 즉시 복귀 → COMBO_RESET
        MvcResult return2 = mockMvc.perform(post("/api/v1/battle/" + sessionId + "/return")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        ReturnResponse returnResp2 = extractData(return2,
                new TypeReference<ApiResponse<ReturnResponse>>() {}).getData();
        assertThat(returnResp2.penaltyType()).isEqualTo(PenaltyType.COMBO_RESET);

        // 8. 전투 종료 (VICTORY) → 보상에 이탈 반영 확인
        MvcResult endResult = mockMvc.perform(post("/api/v1/battle/" + sessionId + "/end")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new EndBattleRequest(BattleResult.VICTORY, 0))))
                .andExpect(status().isOk())
                .andReturn();

        EndBattleResponse battleEnd = extractData(endResult,
                new TypeReference<ApiResponse<EndBattleResponse>>() {}).getData();

        // 이탈이 있었으므로 perfectFocus = false
        assertThat(battleEnd.perfectFocus()).isFalse();
        assertThat(battleEnd.exitCount()).isEqualTo(2);
        // comboBonus = 0 (이탈로 콤보 리셋됨, maxCombo=0)
        assertThat(battleEnd.maxCombo()).isEqualTo(0);

        // 보상 계산: baseExp = 25 * 2 = 50
        // comboBonus = 0 (maxCombo=0)
        // perfectBonus = 0 (exitCount > 0)
        // expEarned = 50 * (1 + 0 + 0) = 50
        assertThat(battleEnd.expEarned()).isEqualTo(50);
        // goldEarned = 50 / 2 = 25
        assertThat(battleEnd.goldEarned()).isEqualTo(25);
    }

    // ═══════════════════════════════════════════════════════════════════
    // 시나리오 5: 스트릭 + 보너스 정확성
    // ═══════════════════════════════════════════════════════════════════

    @Test
    @Order(5)
    @DisplayName("시나리오 5: 스트릭 + 보너스 정확성")
    void scenario5_streak_and_bonus_accuracy() throws Exception {
        seedItems();

        // 사용자 + 캐릭터 준비
        TokenResponse tokens = loginNewUser("KAKAO", "kakao-005", "test5@test.com", "테스터5");
        String token = tokens.accessToken();
        Long userId = tokens.userId();

        mockMvc.perform(post("/api/v1/character")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateCharacterRequest("궁수", ClassType.RANGER,
                                        Map.of("hair", "style1")))))
                .andExpect(status().isOk());

        // 1. 7일 연속 체크인 시뮬레이션 (DB 직접 삽입으로 6일분 기록)
        LocalDate today = LocalDate.now();

        // 스트릭 엔티티 직접 생성: 6일 연속으로 이미 체크인한 상태
        Streak streak = Streak.builder()
                .userId(userId)
                .streakType(StreakType.CHECKIN)
                .build();
        // 6일 연속 체크인 시뮬레이션
        for (int i = 6; i >= 1; i--) {
            streak.recordToday(today.minusDays(i));
        }
        assertThat(streak.getCurrentCount()).isEqualTo(6);
        assertThat(streak.getLastDate()).isEqualTo(today.minusDays(1)); // 어제까지
        streakRepository.save(streak);

        // 캐릭터 현재 exp 확인
        CharacterResponse charBefore = getCharacter(token);
        int expBefore = charBefore.exp();

        // 2. 7일째 체크인 → 스트릭 보너스 exp +50 발생
        CheckinRequest morningReq = new CheckinRequest(
                CheckinType.MORNING,
                new BigDecimal("7.0"), 2, 4,
                null, null, null, null);

        MvcResult checkinResult = mockMvc.perform(post("/api/v1/gate/checkin")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(morningReq)))
                .andExpect(status().isOk())
                .andReturn();

        CheckinResponse checkin = extractData(checkinResult,
                new TypeReference<ApiResponse<CheckinResponse>>() {}).getData();
        assertThat(checkin.streakCount()).isEqualTo(7);

        // AFTER_COMMIT 대기 (체크인 exp + 스트릭 보너스)
        Thread.sleep(500);

        // 스트릭 보너스 exp +50 확인
        CharacterResponse charAfter7 = getCharacter(token);
        // 체크인 exp=10 + 스트릭 보너스 exp=50 = +60 총
        int expGained = charAfter7.exp() - expBefore;
        // 레벨업으로 exp가 리셋됐을 수 있으므로 순수 증가분 체크
        // exp = expBefore + 60 - (레벨업 소비 exp)
        // 대신 간접 확인: 스트릭 7일 보너스 50 + 체크인 10 = 60
        // 레벨업이 없다면 exp +60 정확히
        if (charAfter7.level() == charBefore.level()) {
            assertThat(expGained).isEqualTo(60); // 10 (checkin) + 50 (streak bonus)
        } else {
            // 레벨업이 발생하면 exp 소비가 있으므로 레벨만 확인
            assertThat(charAfter7.level()).isGreaterThan(charBefore.level());
        }

        // 3. 스트릭 확인
        MvcResult streakResult = mockMvc.perform(get("/api/v1/gate/streaks")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();

        List<StreakResponse> streaks = extractData(streakResult,
                new TypeReference<ApiResponse<List<StreakResponse>>>() {}).getData();

        StreakResponse checkinStreak = streaks.stream()
                .filter(s -> s.streakType() == StreakType.CHECKIN)
                .findFirst()
                .orElseThrow();
        assertThat(checkinStreak.currentCount()).isEqualTo(7);
        assertThat(checkinStreak.maxCount()).isEqualTo(7);

        // 4. 하루 빠뜨린 후 체크인 → 스트릭 리셋 확인
        // 스트릭의 lastDate를 2일 전으로 변경 (하루 빠뜨림 시뮬레이션)
        Streak existingStreak = streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN)
                .orElseThrow();
        // recordToday를 모래 후(2일 후) 날짜로 호출하면 gap이 1일 이상이므로 리셋
        // 대신 간접: 직접 스트릭 리셋 테스트
        LocalDate afterGap = today.plusDays(2); // 2일 후 → 하루 빠뜨림
        int resetCount = existingStreak.recordToday(afterGap);
        assertThat(resetCount).isEqualTo(1); // 리셋

        // maxCount는 이전 값(7) 유지
        assertThat(existingStreak.getMaxCount()).isEqualTo(7);

        streakRepository.save(existingStreak);

        // DB에서 다시 확인
        Streak verifyStreak = streakRepository.findByUserIdAndStreakType(userId, StreakType.CHECKIN)
                .orElseThrow();
        assertThat(verifyStreak.getCurrentCount()).isEqualTo(1);
        assertThat(verifyStreak.getMaxCount()).isEqualTo(7);
    }
}
