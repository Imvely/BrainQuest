# BrainQuest — Claude Code 개발 실행 가이드 (라이선스 검증 완료본)

> 모든 기술 스택은 상용 무료 오픈소스(MIT/Apache 2.0/BSD/SIL OFL) 검증 완료
> Oracle JDK 사용 금지 → Eclipse Temurin OpenJDK 21
> Redis 사용 금지 → Valkey 8 (BSD-3, Redis 100% 호환)
> Malgun Gothic 사용 금지 → Pretendard (SIL OFL 1.1)

---

## 핵심 원칙

1. **한 번에 하나의 모듈만** — 전체를 한꺼번에 시키면 실패함
2. **백엔드 먼저, 프론트 나중** — API가 확정되어야 프론트 작업이 수월함
3. **CLAUDE.md 파일을 반드시 만들어라** — 프로젝트 컨텍스트를 유지하는 핵심
4. **매 단계마다 테스트 확인** — 다음 단계로 넘어가기 전 반드시 동작 확인
5. **설계서 PDF를 참조 문서로 제공** — 상세 스펙이 있으면 Claude Code의 정확도가 극적으로 올라감

---

## Phase 0: 프로젝트 초기 세팅

### 0-1. 디렉토리 구조 생성

```bash
mkdir brainquest && cd brainquest
mkdir -p backend frontend docs
```

### 0-2. CLAUDE.md 작성

프로젝트 루트에 별도로 제공한 CLAUDE.md 파일을 배치합니다.
Claude Code는 이 파일을 매번 자동으로 읽어서 컨텍스트를 유지합니다.

### 0-3. 설계서 PDF를 docs/에 복사

```bash
cp ~/Downloads/BrainQuest_MVP_상세_기술_설계서.pdf docs/
cp ~/Downloads/BrainQuest_통합_ADHD앱_상세_기능_스토리.pdf docs/
```

---

## Phase 1: 백엔드 공통 + 인증 모듈

```
docs/BrainQuest_MVP_상세_기술_설계서.pdf 를 읽고 이 프로젝트의 기술 설계서를 이해해줘.

backend/ 디렉토리에 Spring Boot 3.3 + Eclipse Temurin OpenJDK 21 + Gradle 프로젝트를 생성해줘.

1단계: 프로젝트 초기화
- groupId: com.brainquest, artifactId: brainquest-api
- build.gradle에 Java toolchain 설정 (반드시 Adoptium Temurin 사용, Oracle JDK 금지):
  java {
      toolchain {
          languageVersion = JavaLanguageVersion.of(21)
          vendor = JvmVendorSpec.ADOPTIUM
      }
  }
- 의존성 (모두 Apache 2.0 / MIT 라이선스 검증 완료):
  - spring-boot-starter-web (Apache 2.0)
  - spring-boot-starter-data-jpa (Apache 2.0)
  - spring-boot-starter-security (Apache 2.0)
  - spring-boot-starter-validation (Apache 2.0)
  - spring-boot-starter-websocket (Apache 2.0)
  - spring-boot-starter-data-redis (Apache 2.0, Valkey 호환)
  - org.postgresql:postgresql (PostgreSQL License)
  - org.flywaydb:flyway-core (Apache 2.0, Community Edition)
  - org.flywaydb:flyway-database-postgresql (Apache 2.0)
  - io.jsonwebtoken:jjwt-api:0.12.6 (Apache 2.0)
  - io.jsonwebtoken:jjwt-impl:0.12.6 (Apache 2.0, runtimeOnly)
  - io.jsonwebtoken:jjwt-jackson:0.12.6 (Apache 2.0, runtimeOnly)
  - org.springdoc:springdoc-openapi-starter-webmvc-ui:2.5.0 (Apache 2.0)
  - org.projectlombok:lombok (MIT, compileOnly + annotationProcessor)

- application.yml 설정:
  spring:
    datasource:
      url: jdbc:postgresql://localhost:5432/brainquest
      username: brainquest
      password: brainquest
      driver-class-name: org.postgresql.Driver
    data:
      redis:
        host: localhost
        port: 6379
    jpa:
      hibernate:
        ddl-auto: validate
      open-in-view: false
      properties:
        hibernate:
          format_sql: true
          default_batch_fetch_size: 100
    flyway:
      enabled: true
      locations: classpath:db/migration
  
  jwt:
    secret-key: ${JWT_SECRET:my-super-secret-key-for-development-only-change-in-production}
    access-expiration: 900000
    refresh-expiration: 2592000000

- application-dev.yml: 개발용 설정 분리
- application-prod.yml: 프로덕션 설정 (환경변수 참조)

- docker-compose.yml 생성 (로컬 개발용):
  version: '3.8'
  services:
    postgres:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: brainquest
        POSTGRES_USER: brainquest
        POSTGRES_PASSWORD: brainquest
      ports:
        - "5432:5432"
      volumes:
        - pgdata:/var/lib/postgresql/data
    valkey:
      image: valkey/valkey:8-alpine
      ports:
        - "6379:6379"
      volumes:
        - valkeydata:/data
  volumes:
    pgdata:
    valkeydata:

  주의: Redis 대신 반드시 Valkey를 사용해. Redis는 2024년 3월에 SSPL 라이선스로 변경되어 진정한 오픈소스가 아님. Valkey는 Linux Foundation의 Redis 포크로 BSD-3 라이선스이며 Redis 프로토콜과 100% 호환됨. Spring Data Redis 코드 변경 없이 그대로 사용 가능.

2단계: 공통 모듈 (common 패키지)
- BaseEntity (@MappedSuperclass):
  - id: Long (@Id @GeneratedValue(strategy = GenerationType.IDENTITY))
  - createdAt: LocalDateTime (@CreatedDate, @Column(updatable = false))
  - updatedAt: LocalDateTime (@LastModifiedDate)
- ApiResponse<T> (record):
  - success: boolean
  - data: T
  - message: String
  - 정적 팩토리: ApiResponse.of(data), ApiResponse.of(data, message), ApiResponse.error(code, message)
- ErrorResponse (record):
  - success: false (고정)
  - error: ErrorDetail (record: code, message)
- GlobalExceptionHandler (@RestControllerAdvice):
  - MethodArgumentNotValidException → 400 + 필드별 에러 메시지
  - EntityNotFoundException (커스텀) → 404
  - DuplicateResourceException (커스텀) → 409
  - IllegalArgumentException → 400
  - Exception → 500 + 로깅
- 커스텀 예외: EntityNotFoundException, DuplicateResourceException, UnauthorizedException
- JpaAuditingConfig: @Configuration @EnableJpaAuditing

3단계: 인증 모듈 (auth 패키지)
- User 엔티티 (@Entity @Table(name = "users")):
  - CLAUDE.md의 users 테이블 스키마 그대로 매핑
  - @Enumerated(STRING): adhdStatus (enum: UNKNOWN, UNDIAGNOSED, SUSPECTED, DIAGNOSED)
  
- UserRepository (JpaRepository<User, Long>):
  - findByProviderAndProviderId(String provider, String providerId): Optional<User>
  - findByEmail(String email): Optional<User>
  
- JwtTokenProvider (@Component):
  - @Value로 jwt.secret-key, jwt.access-expiration, jwt.refresh-expiration 주입
  - generateAccessToken(Long userId): Access Token 생성 (15분, HS256)
  - generateRefreshToken(Long userId): Refresh Token 생성 (30일, HS256)
  - validateToken(String token): boolean
  - getUserIdFromToken(String token): Long
  - SecretKey 생성: Keys.hmacShaKeyFor(secretKey.getBytes(StandardCharsets.UTF_8))
  
- JwtAuthenticationFilter (OncePerRequestFilter):
  - Authorization 헤더에서 "Bearer " 접두사 제거 후 토큰 추출
  - validateToken → getUserId → UsernamePasswordAuthenticationToken 생성 → SecurityContextHolder 설정
  - 예외 발생 시 필터 체인 계속 진행 (SecurityConfig에서 처리)
  - shouldNotFilter(): /api/v1/auth/** 경로는 필터 스킵
  
- SecurityConfig (@Configuration @EnableWebSecurity):
  - CSRF 비활성화 (REST API이므로)
  - 세션: SessionCreationPolicy.STATELESS
  - permitAll: /api/v1/auth/**, /swagger-ui/**, /v3/api-docs/**, /actuator/health
  - 나머지: authenticated
  - JwtAuthenticationFilter를 UsernamePasswordAuthenticationFilter 앞에 등록
  - PasswordEncoder: BCryptPasswordEncoder 빈 등록 (향후 사용)
  
- AuthController (@RestController @RequestMapping("/api/v1/auth")):
  - POST /login: LoginRequest(provider: String, accessToken: String) → ResponseEntity<ApiResponse<TokenResponse>>
  - POST /refresh: RefreshRequest(refreshToken: String) → ResponseEntity<ApiResponse<TokenResponse>>
  
- AuthService (@Service):
  - login(LoginRequest):
    1. provider에 따라 소셜 토큰 검증 (MVP: 카카오만 우선 구현)
    2. 소셜 API로 사용자 정보 조회 (email, nickname)
    3. users 테이블에서 provider+providerId로 조회
    4. 없으면 신규 생성 (isNewUser = true), 있으면 기존 반환
    5. JWT Access/Refresh Token 발급
    6. TokenResponse 반환
  - refreshToken(RefreshRequest):
    1. Refresh Token 유효성 검증
    2. userId 추출 → 새 Access Token 발급
    3. TokenResponse 반환
    
- KakaoAuthClient (@Component):
  - WebClient (spring-boot-starter-webflux 추가 필요)로 카카오 API 호출
  - GET https://kapi.kakao.com/v2/user/me (Authorization: Bearer {accessToken})
  - 응답에서 id, kakao_account.email, properties.nickname 추출
  
- TokenResponse (record): accessToken, refreshToken, userId, nickname, isNewUser

- DTO:
  - LoginRequest (record): @NotBlank provider, @NotBlank accessToken
  - RefreshRequest (record): @NotBlank refreshToken

4단계: Flyway 마이그레이션
- V1__create_users.sql:
  CREATE TABLE users (
      id BIGSERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE,
      nickname VARCHAR(50) NOT NULL,
      provider VARCHAR(20) NOT NULL,
      provider_id VARCHAR(255) NOT NULL,
      adhd_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
      diagnosis_date DATE,
      timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Seoul',
      wake_time TIME NOT NULL DEFAULT '07:00',
      sleep_time TIME NOT NULL DEFAULT '23:00',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_id)
  );

- V2__create_characters.sql:
  CREATE TABLE characters (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(30) NOT NULL,
      class_type VARCHAR(20) NOT NULL,
      level INT NOT NULL DEFAULT 1,
      exp INT NOT NULL DEFAULT 0,
      exp_to_next INT NOT NULL DEFAULT 100,
      stat_atk INT NOT NULL DEFAULT 10,
      stat_wis INT NOT NULL DEFAULT 10,
      stat_def INT NOT NULL DEFAULT 10,
      stat_agi INT NOT NULL DEFAULT 10,
      stat_hp INT NOT NULL DEFAULT 100,
      gold INT NOT NULL DEFAULT 0,
      appearance JSONB NOT NULL DEFAULT '{}',
      equipped_items JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

모든 코드에 적절한 Javadoc 주석을 달아줘.
docker-compose up -d 로 DB를 띄운 후 ./gradlew build 가 성공하는지 확인해줘.
빌드 실패 시 에러를 수정해줘.
```

---

## Phase 2: GATE 모듈

```
GATE 모듈을 구현해줘. CLAUDE.md와 설계서를 참고해.

1. Flyway 마이그레이션:

- V3__create_screening_results.sql:
  CREATE TABLE screening_results (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      test_type VARCHAR(10) NOT NULL,
      answers JSONB NOT NULL,
      total_score INT NOT NULL,
      risk_level VARCHAR(10) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_screening_user ON screening_results(user_id);

- V4__create_daily_checkins.sql:
  CREATE TABLE daily_checkins (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      checkin_type VARCHAR(10) NOT NULL,
      checkin_date DATE NOT NULL,
      sleep_hours DECIMAL(3,1),
      sleep_quality INT,
      condition INT,
      focus_score INT,
      impulsivity_score INT,
      emotion_score INT,
      memo TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, checkin_date, checkin_type)
  );
  CREATE INDEX idx_checkin_user_date ON daily_checkins(user_id, checkin_date);

- V5__create_medications_and_logs.sql:
  CREATE TABLE medications (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      med_name VARCHAR(100) NOT NULL,
      dosage VARCHAR(50) NOT NULL,
      schedule_time TIME NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

  CREATE TABLE med_logs (
      id BIGSERIAL PRIMARY KEY,
      medication_id BIGINT NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      log_date DATE NOT NULL,
      taken_at TIMESTAMP NOT NULL,
      effectiveness INT,
      side_effects JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

- V6__create_streaks.sql:
  CREATE TABLE streaks (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      streak_type VARCHAR(20) NOT NULL,
      current_count INT NOT NULL DEFAULT 0,
      max_count INT NOT NULL DEFAULT 0,
      last_date DATE,
      UNIQUE(user_id, streak_type)
  );

2. Entity 클래스:
- ScreeningResult: @Entity, answers 필드는 @JdbcTypeCode(SqlTypes.JSON)
- DailyCheckin: @Entity, CheckinType enum (MORNING, EVENING)
- Medication: @Entity
- MedLog: @Entity, sideEffects는 List<String> + @JdbcTypeCode(SqlTypes.JSON)
- Streak: @Entity, StreakType enum (CHECKIN, BATTLE, EMOTION, QUEST)

3. Repository:
- ScreeningResultRepository: findAllByUserIdOrderByCreatedAtDesc
- DailyCheckinRepository:
  - findByUserIdAndCheckinDateAndCheckinType → Optional<DailyCheckin>
  - existsByUserIdAndCheckinDateAndCheckinType → boolean (중복 방지)
  - findByUserIdAndCheckinDateBetweenOrderByCheckinDateDesc → List<DailyCheckin> (기간 조회)
- MedicationRepository: findAllByUserIdAndIsActiveTrue
- MedLogRepository: findByUserIdAndLogDate
- StreakRepository: findByUserIdAndStreakType → Optional<Streak>

4. Service:

ScreeningService (@Service @Transactional(readOnly = true)):
- @Transactional submitScreening(Long userId, ScreeningRequest req):
  - ASRS 점수 계산: answers의 값 합산
  - 리스크 레벨 판정: 14점 이상=HIGH, 10-13=MEDIUM, 9 이하=LOW
  - ScreeningResult 저장
  - 캐릭터 경험치 +30 (characterService.addExp(userId, 30, StatType.HP))
  - 결과 반환: ScreeningResponse(id, totalScore, riskLevel, answers)

CheckinService (@Service @Transactional(readOnly = true)):
- @Transactional submitMorningCheckin(Long userId, MorningCheckinRequest req):
  - 중복 체크: 오늘 날짜 + MORNING 이미 있으면 DuplicateResourceException
  - DailyCheckin 저장 (type=MORNING, sleepHours, sleepQuality, condition)
  - 스트릭 갱신: updateStreak(userId, StreakType.CHECKIN)
  - 경험치: characterService.addExp(userId, 10, StatType.HP)
  - MorningCheckinEvent 발행 (ApplicationEventPublisher.publishEvent)
  - 반환: CheckinResponse(id, streakCount, reward)
  
- @Transactional submitEveningCheckin(Long userId, EveningCheckinRequest req):
  - 중복 체크: 오늘 날짜 + EVENING 이미 있으면 DuplicateResourceException
  - 필드 검증: focusScore, impulsivityScore, emotionScore 각 1~5 범위
  - DailyCheckin 저장 (type=EVENING, focusScore, impulsivityScore, emotionScore, memo)
  - 스트릭 갱신: updateStreak(userId, StreakType.CHECKIN)
  - 경험치: characterService.addExp(userId, 10, StatType.HP)
  - 반환: CheckinResponse(id, streakCount, reward)

- getCheckinHistory(Long userId, LocalDate from, LocalDate to): List<CheckinResponse>

- private updateStreak(Long userId, StreakType type):
  - Streak 조회 (없으면 새로 생성)
  - lastDate == 어제(LocalDate.now().minusDays(1)) → currentCount++
  - lastDate == 오늘 → 변경 없음 (이미 오늘 기록됨)
  - 그 외 → currentCount = 1 (리셋)
  - maxCount = Math.max(currentCount, maxCount)
  - lastDate = 오늘
  - 스트릭 보너스 체크:
    - currentCount == 7 → characterService.addExp(userId, 50, StatType.HP)
    - currentCount == 14 → characterService.addExp(userId, 100, StatType.HP)
    - currentCount == 30 → characterService.addExp(userId, 200, StatType.HP)
    - currentCount == 100 → characterService.addExp(userId, 1000, StatType.HP)
  - StreakUpdatedEvent 발행

MedicationService (@Service @Transactional(readOnly = true)):
- @Transactional registerMedication(Long userId, MedicationRequest req): Medication 저장
- getActiveMedications(Long userId): List<MedicationResponse>
- @Transactional logMedication(Long userId, MedLogRequest req):
  - MedLog 저장
  - 경험치: characterService.addExp(userId, 5, StatType.HP)
  - 반환: MedLogResponse

5. Controller - GateController (@RestController @RequestMapping("/api/v1/gate")):
- POST /screening: @RequestBody @Valid ScreeningRequest → ApiResponse<ScreeningResponse>
- POST /checkin: @RequestBody @Valid CheckinRequest → ApiResponse<CheckinResponse>
  - CheckinRequest에 type 필드로 MORNING/EVENING 구분
- GET /checkin/history: @RequestParam from, to → ApiResponse<List<CheckinResponse>>
- POST /medications: @RequestBody @Valid MedicationRequest → ApiResponse<MedicationResponse>
- POST /med-logs: @RequestBody @Valid MedLogRequest → ApiResponse<MedLogResponse>
- GET /streaks: → ApiResponse<List<StreakResponse>>

6. DTO (모두 record 클래스, @Valid 어노테이션):
- ScreeningRequest: @NotNull testType, @NotNull Map<String, Integer> answers
- MorningCheckinRequest: @NotNull @DecimalMin("0") @DecimalMax("24") BigDecimal sleepHours, @Min(1) @Max(3) Integer sleepQuality, @Min(1) @Max(5) Integer condition
- EveningCheckinRequest: @Min(1) @Max(5) Integer focusScore, @Min(1) @Max(5) Integer impulsivityScore, @Min(1) @Max(5) Integer emotionScore, String memo
- MedicationRequest: @NotBlank String medName, @NotBlank String dosage, @NotNull LocalTime scheduleTime
- MedLogRequest: @NotNull Long medicationId, Integer effectiveness, List<String> sideEffects
- 각 Response record 클래스

7. 이벤트 (event 패키지):
- MorningCheckinEvent extends ApplicationEvent:
  - userId: Long, sleepHours: BigDecimal, condition: Integer
- StreakUpdatedEvent extends ApplicationEvent:
  - userId: Long, streakType: StreakType, currentCount: Integer, isBonus: Boolean

빌드 성공 확인 후 GateService의 단위 테스트도 작성해줘.
- JUnit 5 + Mockito 사용
- submitMorningCheckin: 정상, 중복 방지, 스트릭 갱신 검증
- submitEveningCheckin: 정상, 점수 범위 검증
- updateStreak: 연속 체크인, 리셋, 보너스 지급 검증
```

---

## Phase 3: CHARACTER 모듈

```
CHARACTER 모듈을 구현해줘. CLAUDE.md를 참고해.

1. Entity:
- Character (@Entity @Table(name = "characters")):
  - CLAUDE.md의 characters 스키마 매핑
  - appearance: Map<String, String> + @JdbcTypeCode(SqlTypes.JSON)
  - equippedItems: Map<String, Long> + @JdbcTypeCode(SqlTypes.JSON)
  - ClassType enum: WARRIOR, MAGE, RANGER
  - addExp(int amount) 메서드: exp += amount, 레벨업 체크 로직 포함
  
- Item (@Entity @Table(name = "items")):
  - name, description, slot (enum: HELMET, ARMOR, WEAPON, ACCESSORY)
  - rarity (enum: COMMON, UNCOMMON, RARE, EPIC, LEGENDARY)
  - statBonus: Map<String, Integer> + @JdbcTypeCode(SqlTypes.JSON) → {atk:5, def:3, ...}
  - imageUrl: String
  
- UserItem (@Entity @Table(name = "user_items")):
  - @ManyToOne user, @ManyToOne item
  - acquiredAt: LocalDateTime
  - source: String (BATTLE_DROP / QUEST_REWARD / LEVEL_UP)

2. Flyway:
- V7__create_items.sql: items 테이블 생성 + 시드 데이터 20개 INSERT
  - COMMON 8개 (각 슬롯 2개씩), UNCOMMON 6개, RARE 4개, EPIC 2개
  - statBonus 예시: {"atk": 3, "def": 0, "wis": 0, "agi": 0, "hp": 0}
  
- V8__create_user_items.sql: user_items 테이블 생성

3. Repository:
- CharacterRepository: findByUserId → Optional<Character>
- ItemRepository: findAllByRarity → List<Item>
- UserItemRepository: findAllByUserId → List<UserItem>

4. Service - CharacterService (@Service @Transactional(readOnly = true)):

- @Transactional createCharacter(Long userId, CreateCharacterRequest req):
  - Character 생성 (classType, name, appearance 설정)
  - 클래스별 초기 스탯 차등:
    - WARRIOR: atk=15, def=12, wis=8, agi=8, hp=120
    - MAGE: atk=8, wis=15, def=8, agi=10, hp=90
    - RANGER: atk=10, wis=10, def=10, agi=15, hp=100
  - 저장 후 반환

- getCharacter(Long userId): CharacterResponse (캐릭터 + 장착 장비 상세)

- @Transactional addExp(Long userId, int amount, StatType statType):
  - Character 조회
  - exp += amount
  - 스탯 경험치 분배: statType에 따라 해당 스탯 +1 (amount / 20 만큼, 최소 1)
  - 레벨업 체크 루프 (while exp >= expToNext):
    - level++
    - exp -= expToNext
    - expToNext = (int) Math.floor(50 * Math.pow(level, 1.5))
    - 레벨업 보상:
      - 매 레벨: gold += level * 10
      - 5레벨마다: 아이템 상자 지급 (dropItemBox)
      - 10레벨마다: 캐릭터 외형 해금 데이터 추가
    - LevelUpEvent 발행
  - 저장

- @Transactional addGold(Long userId, int amount):
  - Character 조회 → gold += amount → 저장

- @Transactional equipItem(Long userId, EquipRequest req):
  - UserItem 소유 확인
  - Item의 slot 확인
  - equippedItems 맵 업데이트 (이전 장비는 자동 해제)
  - 스탯 재계산: 기본 스탯 + 장착 장비 statBonus 합산
  - 저장 후 CharacterResponse 반환

- @Transactional dropItem(Long userId, String grade):
  - 등급별 드롭 확률 체크:
    - E=5%, D=10%, C=20%, B=35%, A=50%
    - Random.nextInt(100) < 확률 이면 드롭
  - 드롭 시: rarity 가중치 기반 아이템 풀에서 랜덤 선택
    - grade E/D → COMMON/UNCOMMON 위주
    - grade C → UNCOMMON/RARE 위주
    - grade B/A → RARE/EPIC 위주
  - UserItem 생성 및 저장
  - 드롭 결과 반환 (null이면 드롭 없음)

- private dropItemBox(String rarity):
  - 해당 rarity 이하의 아이템 풀에서 랜덤 1개 지급

5. Controller - CharacterController (@RestController @RequestMapping("/api/v1/character")):
- POST /: @RequestBody @Valid CreateCharacterRequest → ApiResponse<CharacterResponse>
- GET /: → ApiResponse<CharacterResponse>
- PUT /equip: @RequestBody @Valid EquipRequest → ApiResponse<CharacterResponse>
- GET /items: → ApiResponse<List<UserItemResponse>> (인벤토리)

6. DTO:
- CreateCharacterRequest: @NotBlank name, @NotNull ClassType classType, @NotNull Map<String, String> appearance
- EquipRequest: @NotNull String slot, @NotNull Long itemId
- CharacterResponse: id, name, classType, level, exp, expToNext, stats(atk,wis,def,agi,hp), gold, appearance, equippedItems(상세 아이템 정보 포함)
- UserItemResponse: id, item(ItemResponse), acquiredAt, source

7. 이벤트:
- LevelUpEvent: userId, newLevel, rewards(Map)
- StatType enum: ATK, WIS, DEF, AGI, HP

8. 이벤트 리스너 (character 패키지 내 CharacterEventListener @Component):
- 아직 다른 모듈이 없으므로 리스너 클래스만 뼈대 작성
- @EventListener 메서드 시그니처만 준비 (BattleCompletedEvent, QuestCompletedEvent 등)
- 실제 로직은 Phase 8에서 완성

빌드 성공 확인해줘.
```

---

## Phase 4: QUEST 모듈

```
QUEST 모듈을 구현해줘. CLAUDE.md를 참고해.

1. Flyway:
- V9__create_quests.sql:
  CREATE TABLE quests (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      original_title VARCHAR(300) NOT NULL,
      quest_title VARCHAR(300) NOT NULL,
      quest_story TEXT NOT NULL,
      category VARCHAR(20) NOT NULL,
      grade VARCHAR(5) NOT NULL,
      estimated_min INT NOT NULL,
      exp_reward INT NOT NULL,
      gold_reward INT NOT NULL,
      status VARCHAR(15) NOT NULL DEFAULT 'ACTIVE',
      due_date DATE,
      completed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_quest_user_status ON quests(user_id, status);

- V10__create_checkpoints.sql:
  CREATE TABLE checkpoints (
      id BIGSERIAL PRIMARY KEY,
      quest_id BIGINT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
      order_num INT NOT NULL,
      title VARCHAR(300) NOT NULL,
      estimated_min INT NOT NULL,
      exp_reward INT NOT NULL,
      gold_reward INT NOT NULL,
      status VARCHAR(15) NOT NULL DEFAULT 'PENDING',
      completed_at TIMESTAMP
  );
  CREATE INDEX idx_checkpoint_quest ON checkpoints(quest_id);

2. Entity:
- Quest: @Entity, Grade enum (E, D, C, B, A), QuestStatus enum (ACTIVE, IN_PROGRESS, COMPLETED, ABANDONED), QuestCategory enum (WORK, HOME, HEALTH, SOCIAL, SELF)
- Checkpoint: @Entity @ManyToOne quest, CheckpointStatus enum (PENDING, IN_PROGRESS, COMPLETED)

3. Repository:
- QuestRepository:
  - findAllByUserIdAndStatusOrderByCreatedAtDesc
  - findAllByUserIdAndStatusAndCategory
  - countByUserIdAndStatus
- CheckpointRepository:
  - findAllByQuestIdOrderByOrderNum
  - countByQuestIdAndStatus

4. Service - QuestService (@Service @Transactional(readOnly = true)):

- @Transactional generateQuest(Long userId, GenerateQuestRequest req):
  - Claude API 호출 (ClaudeApiClient.generateQuestStory)
  - 응답 파싱: questTitle, questStory, checkpoints
  - 난이도 자동 산정: estimatedMin 기반
    - ≤10분 → E, ≤30분 → D, ≤60분 → C, ≤120분 → B, >120분 → A
  - 보상 계산: CLAUDE.md의 등급별 보상 테이블 참조
    - E: exp=10, gold=5 / D: 25, 15 / C: 50, 30 / B: 100, 60 / A: 200, 120
  - 체크포인트 보상 분배: 전체 보상 / 체크포인트 수 (마지막은 +20%)
  - GenerateQuestResponse 반환 (아직 저장 안 함)

- @Transactional saveQuest(Long userId, SaveQuestRequest req):
  - Quest + Checkpoint 리스트 저장
  - Quest 반환

- getActiveQuests(Long userId, QuestCategory category): List<QuestResponse>
- getQuestDetail(Long questId): QuestDetailResponse (체크포인트 포함)

- @Transactional completeCheckpoint(Long userId, Long questId, Long checkpointId):
  - Checkpoint 상태 → COMPLETED, completedAt = now
  - 체크포인트 보상 지급: characterService.addExp/addGold
  - CheckpointCompletedEvent 발행
  - 모든 체크포인트 완료 여부 체크:
    - 전부 완료 → Quest 상태 → COMPLETED, completedAt = now
    - Quest 전체 보상 잔여분 지급
    - 아이템 드롭: characterService.dropItem(userId, quest.grade)
    - QuestCompletedEvent 발행
  - 반환: CheckpointCompleteResponse(checkpoint, reward, questCompleted, itemDrop)

5. ClaudeApiClient (@Component):
- WebClient 기반 비동기 호출
- Anthropic API:
  - URL: https://api.anthropic.com/v1/messages
  - Header: x-api-key, anthropic-version: 2023-06-01, Content-Type: application/json
  - model: "claude-sonnet-4-20250514" (비용 효율: 건당 ~$0.003)
  - max_tokens: 1024
- 시스템 프롬프트:
  "당신은 ADHD 사용자의 할 일을 판타지 RPG 퀘스트로 변환하는 AI입니다.
   반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.
   {
     \"questTitle\": \"RPG 스타일 퀘스트 제목\",
     \"questStory\": \"2~3문장의 재미있는 퀘스트 배경 스토리\",
     \"checkpoints\": [
       {\"title\": \"체크포인트 제목\", \"estimatedMin\": 예상시간(분)}
     ]
   }
   체크포인트는 2~5개로 분해해주세요. 각 체크포인트는 구체적인 행동이어야 합니다."
   
- 유저 프롬프트: "할 일: {originalTitle}\n예상 소요 시간: {estimatedMin}분\n카테고리: {category}"

- Rate Limiting: Valkey(Redis 호환)에 사용자별 일일 호출 수 카운터
  - Key: "claude:ratelimit:{userId}:{today}", TTL: 24시간
  - 30회 초과 시 → RateLimitExceededException

- 타임아웃: 30초

- 실패 시 폴백 (fallbackGenerateQuest):
  - AI 없이 기본 템플릿 적용
  - questTitle: "용사의 {originalTitle} 퀘스트"
  - questStory: "이 퀘스트를 완수하면 왕국에 평화가 찾아올 것이다!"
  - checkpoints: 단일 체크포인트 [{title: originalTitle, estimatedMin: estimatedMin}]

6. Controller - QuestController (@RestController @RequestMapping("/api/v1/quest")):
- POST /generate: @RequestBody @Valid GenerateQuestRequest → ApiResponse<GenerateQuestResponse>
- POST /: @RequestBody @Valid SaveQuestRequest → ApiResponse<QuestResponse>
- GET /: @RequestParam(required=false) status, category → ApiResponse<List<QuestResponse>>
- GET /{id}: → ApiResponse<QuestDetailResponse>
- PUT /{questId}/checkpoints/{cpId}/complete: → ApiResponse<CheckpointCompleteResponse>

7. DTO:
- GenerateQuestRequest: @NotBlank originalTitle, @NotNull @Min(5) Integer estimatedMin, @NotNull QuestCategory category
- SaveQuestRequest: originalTitle, questTitle, questStory, category, grade, estimatedMin, List<CheckpointRequest> checkpoints
- CheckpointRequest: title, estimatedMin
- GenerateQuestResponse: questTitle, questStory, grade, expReward, goldReward, List<CheckpointResponse> checkpoints
- QuestResponse: id, originalTitle, questTitle, grade, status, estimatedMin, expReward, goldReward, completedCheckpoints, totalCheckpoints
- QuestDetailResponse: quest + List<CheckpointResponse>
- CheckpointCompleteResponse: checkpoint, reward(exp, gold), questCompleted, itemDrop(nullable)

8. 이벤트:
- QuestCompletedEvent: userId, questId, grade, expReward, goldReward
- CheckpointCompletedEvent: userId, checkpointId, questId, expReward

빌드 성공 확인해줘.
API가 정상 작동하는지 Swagger UI (/swagger-ui/index.html)에서 확인해줘.
```

---

## Phase 5: BATTLE 모듈

```
BATTLE 모듈을 구현해줘. 이것이 핵심 모듈이니 로직을 정확히 구현해야 해.
CLAUDE.md의 전투 데미지 & 이탈 페널티 수치를 반드시 참고해.

1. Flyway:
- V11__create_battle_sessions.sql:
  CREATE TABLE battle_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      quest_id BIGINT REFERENCES quests(id),
      checkpoint_id BIGINT REFERENCES checkpoints(id),
      planned_min INT NOT NULL,
      actual_min INT,
      monster_type VARCHAR(30) NOT NULL,
      monster_max_hp INT NOT NULL,
      monster_remaining_hp INT NOT NULL,
      max_combo INT NOT NULL DEFAULT 0,
      exit_count INT NOT NULL DEFAULT 0,
      total_exit_sec INT NOT NULL DEFAULT 0,
      result VARCHAR(10),
      exp_earned INT NOT NULL DEFAULT 0,
      gold_earned INT NOT NULL DEFAULT 0,
      item_drops JSONB,
      started_at TIMESTAMP NOT NULL,
      ended_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_battle_user ON battle_sessions(user_id);
  CREATE INDEX idx_battle_started ON battle_sessions(started_at);

- V12__create_battle_exits.sql:
  CREATE TABLE battle_exits (
      id BIGSERIAL PRIMARY KEY,
      session_id BIGINT NOT NULL REFERENCES battle_sessions(id) ON DELETE CASCADE,
      exit_at TIMESTAMP NOT NULL,
      return_at TIMESTAMP,
      duration_sec INT,
      penalty_type VARCHAR(20) NOT NULL
  );

2. Entity:
- BattleSession: @Entity, BattleResult enum (VICTORY, DEFEAT, ABANDON)
  - itemDrops: List<Map<String, Object>> + @JdbcTypeCode(SqlTypes.JSON)
- BattleExit: @Entity, PenaltyType enum (COMBO_RESET, HP_RECOVER, HP_DAMAGE, DEFEAT)

3. Repository:
- BattleSessionRepository:
  - findByIdAndUserId → Optional (소유권 확인)
  - findAllByUserIdAndStartedAtBetween → List (기간 조회)
  - countByUserIdAndResultAndStartedAtAfter → long (일일 승리 수)
- BattleExitRepository:
  - findAllBySessionId → List

4. Service - BattleService (@Service @Transactional(readOnly = true)):

- @Transactional startBattle(Long userId, StartBattleRequest req):
  - 진행 중인 세션 있는지 확인 (있으면 → 에러 또는 자동 패배 처리)
  - 몬스터 HP 결정 (연결된 퀘스트의 grade 기반):
    - E=100, D=300, C=600, B=1200, A=2400
    - 퀘스트 연결 없으면 → plannedMin 기반 자동 결정 (15분→D, 25분→C, 40분→B, 50분→A)
  - 몬스터 타입 결정: grade별 (E=슬라임, D=고블린, C=오크, B=드래곤, A=마왕)
  - BattleSession 생성 (status=진행중, startedAt=now)
  - 반환: StartBattleResponse(sessionId, monster, plannedMin)

- @Transactional recordExit(Long userId, Long sessionId):
  - 세션 소유권 확인
  - BattleExit 생성 (exitAt=now, penaltyType=TBD)
  - 세션 exitCount++
  - 반환: ExitResponse(exitId)

- @Transactional recordReturn(Long userId, Long sessionId):
  - 마지막 BattleExit 조회 (returnAt이 null인 것)
  - durationSec 계산: now - exitAt (초)
  - 페널티 판정:
    - ≤30초: COMBO_RESET
    - 31~60초: HP_RECOVER → monsterRemainingHp += monsterMaxHp * 0.1
    - 61~120초: HP_DAMAGE → 캐릭터 HP 계산용 기록 (클라이언트에 전달)
    - 121~300초: HP_DAMAGE (심각)
    - >300초: 이 경우는 endBattle로 자동 패배 처리 (클라이언트에서 감지)
  - BattleExit 업데이트 (returnAt, durationSec, penaltyType)
  - 세션 totalExitSec += durationSec
  - 반환: ReturnResponse(penaltyType, durationSec, monsterRemainingHp)

- @Transactional endBattle(Long userId, Long sessionId, EndBattleRequest req):
  - 세션 소유권 확인
  - actualMin 계산: (now - startedAt).toMinutes() - (totalExitSec / 60)
  - maxCombo 업데이트 (req에서 전달받은 값, 서버 검증: actualMin / 5 이하인지)
  - result에 따른 보상 계산:
    VICTORY:
      baseExp = plannedMin * 2
      comboBonus = maxCombo >= 5 ? 0.5 : maxCombo >= 3 ? 0.3 : maxCombo >= 1 ? 0.1 : 0
      perfectBonus = exitCount == 0 ? 0.5 : 0
      totalExp = (int)(baseExp * (1 + comboBonus + perfectBonus))
      goldEarned = baseExp / 2
    DEFEAT:
      totalExp = (int)(plannedMin * 2 * 0.3)
      goldEarned = 0
    ABANDON:
      totalExp = 0
      goldEarned = 0
  
  - 세션 업데이트: result, actualMin, expEarned, goldEarned, endedAt=now
  - 경험치/골드 지급: characterService.addExp(ATK), characterService.addGold
  - 스트릭 갱신: VICTORY 시 BATTLE 스트릭 갱신
  
  - BattleCompletedEvent 발행:
    - userId, sessionId, result, expEarned, checkpointId
    - 중요: checkpointId가 있고 result=VICTORY면 QUEST 모듈에서 자동 완료 처리됨
  
  - 반환: EndBattleResponse(result, actualMin, expEarned, goldEarned, maxCombo, levelUp, itemDrop)

- getBattleHistory(Long userId, LocalDate from, LocalDate to): List<BattleHistoryResponse>

5. Controller - BattleController (@RestController @RequestMapping("/api/v1/battle")):
- POST /start: @RequestBody @Valid StartBattleRequest → ApiResponse<StartBattleResponse>
- POST /{id}/exit: → ApiResponse<ExitResponse>
- POST /{id}/return: → ApiResponse<ReturnResponse>
- POST /{id}/end: @RequestBody @Valid EndBattleRequest → ApiResponse<EndBattleResponse>
- GET /history: @RequestParam from, to → ApiResponse<List<BattleHistoryResponse>>

6. DTO:
- StartBattleRequest: @NotNull @Min(5) @Max(60) Integer plannedMin, Long questId(nullable), Long checkpointId(nullable)
- EndBattleRequest: @NotNull BattleResult result, @Min(0) Integer maxCombo
- StartBattleResponse: sessionId, monster(type, maxHp), plannedMin
- ReturnResponse: penaltyType, durationSec, monsterRemainingHp, remainingTimeSec
- EndBattleResponse: result, actualMin, expEarned, goldEarned, maxCombo, exitCount, perfectFocus(boolean), levelUp(nullable), itemDrop(nullable)
- BattleHistoryResponse: id, questTitle, plannedMin, actualMin, result, expEarned, startedAt

7. 이벤트:
- BattleCompletedEvent: userId, sessionId, result, expEarned, goldEarned, checkpointId(nullable), questId(nullable)

빌드 성공 확인하고, 전투 플로우를 Swagger에서 수동 테스트해줘:
1. POST /start → sessionId 확보
2. POST /{id}/exit → 이탈 기록
3. POST /{id}/return → 복귀 + 페널티 확인
4. POST /{id}/end (VICTORY) → 보상 확인
```

---

## Phase 6: MAP 모듈

```
MAP 모듈을 구현해줘. CLAUDE.md를 참고해.

1. Flyway:
- V13__create_time_blocks.sql:
  CREATE TABLE time_blocks (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      block_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      category VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      quest_id BIGINT REFERENCES quests(id),
      status VARCHAR(15) NOT NULL DEFAULT 'PLANNED',
      actual_start TIMESTAMP,
      actual_end TIMESTAMP,
      source VARCHAR(15) NOT NULL DEFAULT 'MANUAL',
      is_buffer BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_block_user_date ON time_blocks(user_id, block_date);

- V14__create_time_predictions.sql:
  CREATE TABLE time_predictions (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      block_id BIGINT NOT NULL REFERENCES time_blocks(id) ON DELETE CASCADE,
      predicted_min INT NOT NULL,
      actual_min INT,
      accuracy_pct DECIMAL(5,2),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );

2. Entity:
- TimeBlock: @Entity, BlockCategory enum (WORK, HOME, HEALTH, SOCIAL, REST, CUSTOM), BlockStatus enum (PLANNED, IN_PROGRESS, COMPLETED, SKIPPED), BlockSource enum (MANUAL, AI_SUGGESTED, CALENDAR_SYNC)
- TimePrediction: @Entity @ManyToOne timeBlock

3. Repository:
- TimeBlockRepository:
  - findAllByUserIdAndBlockDateOrderByStartTime → List<TimeBlock>
  - findAllByUserIdAndQuestId → List<TimeBlock>
- TimePredictionRepository:
  - findByBlockId → Optional<TimePrediction>
  - findAllByUserIdAndCreatedAtBetween → List (주간 정확도 통계용)

4. Service - TimeBlockService (@Service @Transactional(readOnly = true)):
- @Transactional createBlock(Long userId, CreateBlockRequest req):
  - 시간 겹침 체크: 같은 날짜에 시간이 겹치는 블록이 있는지 확인
  - TimeBlock 저장
  - 반환: BlockResponse

- @Transactional updateBlock(Long userId, Long blockId, UpdateBlockRequest req):
  - 소유권 확인
  - 시간/제목/카테고리/상태 업데이트
  - 반환: BlockResponse

- @Transactional deleteBlock(Long userId, Long blockId):
  - 소유권 확인 → 삭제

- getTimeline(Long userId, LocalDate date):
  - TimeBlock 목록 조회 (해당 날짜)
  - 연결된 Quest 정보 JOIN (questId가 있는 블록)
  - 해당 날짜의 EmotionRecord 조회 ([SKY] 연동)
  - 해당 날짜의 BattleSession 조회 ([BATTLE] 연동)
  - TimelineResponse 구성: blocks, quests, emotions, battles, remainingMin

- calculateRemainingTime(Long userId):
  - User의 sleepTime 조회
  - 남은 시간 = sleepTime - LocalTime.now() (분 단위)
  - 음수면 0 반환 (이미 취침 시간 지남)

- @Transactional completeBlock(Long userId, Long blockId):
  - status → COMPLETED, actualEnd = now

5. Service - TimePredictionService (@Service @Transactional(readOnly = true)):
- @Transactional recordPrediction(Long userId, RecordPredictionRequest req):
  - TimePrediction 저장 (predictedMin만, actualMin은 나중에)
  
- @Transactional recordActual(Long userId, Long predictionId, int actualMin):
  - 정확도 계산: accuracy = max(0, 100 - abs(predicted - actual) / (double)predicted * 100)
  - TimePrediction 업데이트
  - 정확도 보너스: abs(predicted - actual) <= 5 → characterService.addExp(userId, 15, StatType.AGI)
  - 반환: PredictionResultResponse(predictedMin, actualMin, accuracyPct, expEarned)

6. Controller - MapController (@RestController @RequestMapping("/api/v1/map")):
- GET /timeline/{date}: @PathVariable LocalDate → ApiResponse<TimelineResponse>
- POST /blocks: @RequestBody @Valid CreateBlockRequest → ApiResponse<BlockResponse>
- PUT /blocks/{id}: @RequestBody @Valid UpdateBlockRequest → ApiResponse<BlockResponse>
- DELETE /blocks/{id}: → ApiResponse<Void>
- GET /remaining-time: → ApiResponse<RemainingTimeResponse>
- POST /predictions: @RequestBody @Valid RecordPredictionRequest → ApiResponse<PredictionResponse>
- PUT /predictions/{id}/actual: @RequestBody @Valid RecordActualRequest → ApiResponse<PredictionResultResponse>

7. DTO:
- CreateBlockRequest: @NotNull blockDate, @NotNull startTime, @NotNull endTime, @NotNull category, @NotBlank title, questId(nullable)
- UpdateBlockRequest: startTime, endTime, category, title, status (모두 nullable - 변경할 것만)
- BlockResponse: id, blockDate, startTime, endTime, category, title, questId, status, source
- TimelineResponse: blocks(List<BlockResponse>), remainingMin, questSummary(completed/total), emotionRecords, battleSessions
- RemainingTimeResponse: remainingMin, sleepTime
- RecordPredictionRequest: @NotNull blockId, @NotNull @Min(1) predictedMin
- RecordActualRequest: @NotNull @Min(1) actualMin
- PredictionResultResponse: predictedMin, actualMin, accuracyPct, expEarned

8. 이벤트 리스너 (MapEventListener @Component):
- @EventListener QuestCompletedEvent → 연결된 타임블록 status=COMPLETED로 변경

빌드 성공 확인해줘.
```

---

## Phase 7: SKY 모듈

```
SKY 모듈을 구현해줘. CLAUDE.md를 참고해.

1. Flyway:
- V15__create_emotion_records.sql:
  CREATE TABLE emotion_records (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      weather_type VARCHAR(15) NOT NULL,
      intensity INT NOT NULL,
      tags JSONB,
      memo TEXT,
      voice_url VARCHAR(500),
      voice_transcript TEXT,
      recorded_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
  );
  CREATE INDEX idx_emotion_user_recorded ON emotion_records(user_id, recorded_at);

2. Entity:
- EmotionRecord: @Entity
  - WeatherType enum: SUNNY(7), PARTLY_CLOUDY(6), CLOUDY(5), FOG(4), RAIN(3), THUNDER(2), STORM(1)
  - 각 enum에 numericValue 필드 포함
  - tags: List<String> + @JdbcTypeCode(SqlTypes.JSON)

3. Repository:
- EmotionRecordRepository:
  - findAllByUserIdAndRecordedAtBetweenOrderByRecordedAt → List
  - countByUserIdAndRecordedAtBetween → long (일일 횟수 제한용)

4. Service - EmotionService (@Service @Transactional(readOnly = true)):

- @Transactional recordEmotion(Long userId, RecordEmotionRequest req):
  - 일일 5회 제한 체크: 오늘 00:00~23:59 사이 기록 수 카운트
    - 5회 이상이면 → IllegalStateException("일일 최대 5회 기록 가능합니다")
  - EmotionRecord 저장 (recordedAt은 req에서 전달, 기본값 now)
  - 경험치: characterService.addExp(userId, 5, StatType.DEF)
  - EmotionRecordedEvent 발행 (userId, weatherType, intensity)
  - 반환: EmotionResponse

- getMonthlyCalendar(Long userId, YearMonth yearMonth):
  - 해당 월의 모든 EmotionRecord 조회
  - 날짜별로 그룹핑 (Map<LocalDate, List<EmotionRecord>>)
  - 각 날짜의 대표 날씨 계산:
    - 각 기록의 (weatherType.numericValue * intensity)의 가중 합 / 총 intensity
    - 결과값을 가장 가까운 WeatherType으로 매핑
  - 반환: MonthlyCalendarResponse(days: List<DayEmotionSummary>)
  - DayEmotionSummary: date, dominantWeather, recordCount, records(List)

- getWeeklySummary(Long userId):
  - 이번 주 (월~일) EmotionRecord 조회
  - 날씨 분포 집계: {SUNNY: 3, CLOUDY: 2, RAIN: 1, ...}
  - 전주 동일 기간 조회 → 비교
  - 반환: WeeklySummaryResponse(distribution, comparedToLastWeek, totalRecords)

- getEmotionsByDate(Long userId, LocalDate date): List<EmotionResponse>

5. Controller - SkyController (@RestController @RequestMapping("/api/v1/sky")):
- POST /emotions: @RequestBody @Valid RecordEmotionRequest → ApiResponse<EmotionResponse>
- GET /calendar/{yearMonth}: @PathVariable YearMonth → ApiResponse<MonthlyCalendarResponse>
- GET /summary/weekly: → ApiResponse<WeeklySummaryResponse>
- GET /emotions: @RequestParam date → ApiResponse<List<EmotionResponse>>

6. DTO:
- RecordEmotionRequest: @NotNull WeatherType weatherType, @NotNull @Min(1) @Max(5) Integer intensity, List<String> tags, String memo, LocalDateTime recordedAt(기본값 now)
- EmotionResponse: id, weatherType, intensity, tags, memo, recordedAt
- DayEmotionSummary: date, dominantWeather, recordCount, records
- MonthlyCalendarResponse: yearMonth, days(List<DayEmotionSummary>)
- WeeklySummaryResponse: weekStart, weekEnd, distribution(Map<WeatherType, Integer>), comparedToLastWeek(Map<WeatherType, Integer>), totalRecords, avgWeatherValue

7. 이벤트:
- EmotionRecordedEvent: userId, weatherType, intensity

빌드 성공 확인해줘.
```

---

## Phase 8: 이벤트 버스 통합

```
모든 모듈의 이벤트 버스를 연결해줘. CLAUDE.md의 "모듈 간 이벤트" 섹션을 참고해.

1. event/events 패키지에 모든 이벤트 클래스 정리:
- 이미 생성된 이벤트 확인하고, 누락된 것 추가
- 모든 이벤트는 ApplicationEvent를 상속하거나 record로 구현 (Spring 4.2+ 가능)

이벤트 전체 목록과 처리 로직:

2. CharacterEventListener (@Component, character 패키지):
@EventListener
- BattleCompletedEvent 처리:
  - result == VICTORY → addExp(userId, expEarned, StatType.ATK)
  - addGold(userId, goldEarned)
  
@EventListener  
- QuestCompletedEvent 처리:
  - addExp(userId, expReward, StatType.WIS)
  - addGold(userId, goldReward)
  - dropItem(userId, grade) → 아이템 드롭 시도
  
@EventListener
- CheckpointCompletedEvent 처리:
  - addExp(userId, expReward, StatType.WIS)
  
@EventListener
- EmotionRecordedEvent 처리:
  - addExp(userId, 5, StatType.DEF)
  → 주의: EmotionService에서 이미 addExp를 호출하고 있다면 중복 방지 필요!
  → 한 곳에서만 호출하도록 통일 (Service에서 직접 호출 제거하고 이벤트 리스너에서만 처리하는 방식 추천)
  
@EventListener
- StreakUpdatedEvent 처리:
  - isBonus == true → 해당 보너스 경험치/아이템 지급

3. QuestEventListener (@Component, quest 패키지):
@EventListener
- BattleCompletedEvent 처리:
  - checkpointId가 null이 아니고 result == VICTORY면:
    - questService.completeCheckpoint(userId, questId, checkpointId) 호출
  - 주의: @TransactionalEventListener(phase = AFTER_COMMIT) 사용 → 전투 트랜잭션 커밋 후 실행

4. MapEventListener (@Component, map 패키지):
@EventListener
- QuestCompletedEvent 처리:
  - questId로 연결된 TimeBlock 조회
  - 있으면 status → COMPLETED, actualEnd = now

@EventListener
- EmotionRecordedEvent 처리:
  - 별도 처리 불필요 (타임라인 조회 시 EmotionRecord를 JOIN해서 가져옴)

5. NotificationEventListener (@Component, notification 패키지):
@EventListener
- LevelUpEvent 처리:
  - 레벨업 축하 로그 남기기 (MVP에서 FCM 푸시는 Phase 9 프론트엔드에서 구현)
  - log.info("User {} leveled up to {}", userId, newLevel)

6. 중복 경험치 방지 리팩토링:
- 각 모듈 Service에서 characterService.addExp()를 직접 호출하는 부분을 검토
- 원칙: 
  - 이벤트 발행 후 CharacterEventListener에서 경험치를 처리하는 것을 기본으로
  - 단, 스크리닝/체크인/약물 기록처럼 이벤트가 없는 경우는 Service에서 직접 호출
  - 이벤트가 있는 경우 (Battle, Quest, Emotion) → 이벤트 리스너에서만 처리
  
- 구체적으로:
  - GateService(체크인): 이벤트 없이 직접 addExp → 유지
  - BattleService.endBattle: addExp/addGold 직접 호출 제거 → BattleCompletedEvent로 위임
  - QuestService.completeCheckpoint: addExp/addGold 직접 호출 제거 → CheckpointCompletedEvent로 위임
  - EmotionService.recordEmotion: addExp 직접 호출 제거 → EmotionRecordedEvent로 위임

7. @Transactional 경계 설정:
- 이벤트 리스너는 기본적으로 발행자의 트랜잭션에 참여
- 독립 트랜잭션이 필요한 경우: @TransactionalEventListener(phase = AFTER_COMMIT)
  - QuestEventListener의 BattleCompletedEvent 처리는 AFTER_COMMIT 사용
    (전투 데이터가 커밋된 후 체크포인트 완료 처리)
- 이벤트 리스너 실패 시 예외를 삼키지 말고 로깅:
  try { ... } catch (Exception e) { log.error("이벤트 처리 실패: {}", e.getMessage(), e); }

8. 전체 이벤트 흐름 검증 테스트:
통합 테스트로 아래 시나리오를 검증해줘:
- 전투 완료(VICTORY) → 체크포인트 자동 완료 → 퀘스트 완료 → 캐릭터 경험치/골드/아이템 → 레벨업
- 이 체인이 정상 작동하는지 확인

빌드 성공 확인해줘.
```

---

## Phase 9: 프론트엔드

### 9-0. 프로젝트 초기화

```
frontend/ 디렉토리에 Expo + TypeScript 프로젝트를 생성해줘.

npx create-expo-app frontend --template expo-template-blank-typescript

패키지 설치 (모두 MIT 또는 Apache 2.0 라이선스):
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install zustand @tanstack/react-query
npm install react-native-reanimated react-native-svg
npm install expo-notifications expo-haptics expo-av expo-font expo-splash-screen
npm install react-native-mmkv
npm install lottie-react-native
npm install date-fns
npm install axios

한국어 폰트 설정 (Pretendard 사용 - SIL OFL 1.1 라이선스, 상용 무료):
- assets/fonts/ 디렉토리에 Pretendard-Regular.otf, Pretendard-Bold.otf, Pretendard-Light.otf 배치
- 주의: Malgun Gothic은 Microsoft 소유 폰트로 재배포 금지. 절대 사용하지 마.
- Pretendard 다운로드: https://github.com/orioncactus/pretendard

디렉토리 구조:
src/
├── screens/
│   ├── auth/            # LoginScreen
│   ├── onboarding/      # ScreeningScreen, StyleQuizScreen, CharacterCreateScreen
│   ├── map/             # TimelineScreen (메인 홈)
│   ├── quest/           # QuestBoardScreen, QuestDetailScreen, QuestCreateScreen
│   ├── battle/          # BattleScreen, BattleResultScreen
│   ├── sky/             # EmotionRecordScreen, EmotionCalendarScreen, WeeklySummaryScreen
│   ├── character/       # CharacterScreen, InventoryScreen
│   └── gate/            # CheckinScreen, MedicationScreen
├── components/
│   ├── common/          # Button, Card, Modal, Badge, ProgressBar, Header
│   ├── timeline/        # CircularTimeline, TimeBlock, TimePointer, RemainingTime
│   ├── battle/          # Monster, ComboGauge, HpBar, DamageEffect, VictoryAnimation
│   ├── weather/         # WeatherIcon, WeatherPicker, WeatherCalendar, WeatherCard
│   └── quest/           # QuestCard, CheckpointList, GradeIcon, RewardAnimation
├── navigation/
│   ├── AuthStack.tsx
│   ├── OnboardingStack.tsx
│   ├── MainTab.tsx
│   └── RootNavigator.tsx
├── stores/              # Zustand
│   ├── useAuthStore.ts
│   ├── useCharacterStore.ts
│   ├── useTimelineStore.ts
│   ├── useQuestStore.ts
│   ├── useBattleStore.ts
│   └── useEmotionStore.ts
├── api/                 # Axios
│   ├── client.ts        # Axios 인스턴스 (baseURL, JWT 자동 첨부, 401 리프레시)
│   ├── auth.ts
│   ├── gate.ts
│   ├── map.ts
│   ├── quest.ts
│   ├── battle.ts
│   ├── sky.ts
│   └── character.ts
├── hooks/               # React Query 래핑
│   ├── useTimeline.ts
│   ├── useQuests.ts
│   ├── useBattle.ts
│   ├── useEmotions.ts
│   └── useCharacter.ts
├── types/
│   ├── api.ts           # ApiResponse<T> 제네릭
│   ├── user.ts
│   ├── character.ts
│   ├── quest.ts
│   ├── battle.ts
│   ├── emotion.ts
│   └── timeline.ts
├── constants/
│   ├── colors.ts        # PRIMARY: '#6C5CE7', SECONDARY: '#00CEC9', ACCENT: '#FD79A8' 등
│   ├── fonts.ts         # Pretendard 패밀리 정의
│   ├── game.ts          # 등급별 보상, 레벨 테이블, 몬스터 HP 등
│   └── weather.ts       # WeatherType 정의, 아이콘 매핑
└── utils/
    ├── time.ts          # 시간 계산 (잔여 시간, 분→시:분 변환)
    ├── format.ts        # 숫자 포맷, 날짜 포맷
    └── storage.ts       # MMKV 래퍼 (토큰 저장 등)

네비게이션 구조:
- RootNavigator: isLoggedIn ? (hasCharacter ? MainTab : OnboardingStack) : AuthStack
- AuthStack: LoginScreen
- OnboardingStack: ScreeningScreen → StyleQuizScreen → CharacterCreateScreen
- MainTab (Bottom Tab, 5탭):
  - MAP (홈, 타임라인) - 아이콘: 지도
  - QUEST (퀘스트 보드) - 아이콘: 검
  - BATTLE (전투 시작) - 아이콘: 방패 (중앙 강조)
  - SKY (감정 날씨) - 아이콘: 구름
  - MORE (더보기) - 아이콘: 메뉴
    - 캐릭터/인벤토리
    - 체크인
    - 약물 관리
    - 설정

api/client.ts 핵심:
- baseURL: __DEV__ ? 'http://localhost:8080/api/v1' : 'https://api.brainquest.app/api/v1'
- 요청 인터셉터: MMKV에서 accessToken 읽어서 Authorization 헤더 자동 첨부
- 응답 인터셉터: 401 에러 시 refreshToken으로 재발급 시도 → 실패하면 로그아웃

디자인 컨셉:
- 다크 배경(#0F0A2A) + 네온 악센트(보라/민트/핑크) RPG 게임 UI
- 둥근 모서리(borderRadius: 12), 그림자, 카드 기반 레이아웃
- 폰트: Pretendard (절대 Malgun Gothic 사용 금지)
- 주요 색상: #6C5CE7(보라), #00CEC9(민트), #FD79A8(핑크), #E17055(주황)

프로젝트 초기 구조만 잡고, 빌드가 성공하는지 확인해줘.
```

### 9-1. 화면 구현은 각각 별도 프롬프트로 시킨다:

```
[MAP] 메인 타임라인 화면을 구현해줘.
CLAUDE.md의 MAP 모듈 설명과 API 명세를 참고해.

- 24시간 원형 타임라인: react-native-svg로 Circle + Arc 기반 원형 차트
  - 사용자의 wakeTime~sleepTime 구간을 활성 Arc로 렌더링
  - 각 타임블록을 컬러 Arc로 표시 (카테고리별: WORK=#6C5CE7, HOME=#00B894, REST=#FDCB6E, SOCIAL=#FD79A8, HEALTH=#0984E3)
  - 현재 시각 포인터: react-native-reanimated의 useAnimatedStyle + useSharedValue로 1분마다 회전
  - 지나간 시간은 opacity 0.3으로 어둡게
  - 빈 시간 영역 탭 → 타임블록 추가 모달 (bottom sheet)
- 중앙: 잔여 활동 시간 대형 텍스트 (Pretendard Bold, 32pt) + 현재 감정 날씨 아이콘
- 상단: 캐릭터 미니 아바타 + 레벨 + 경험치 바
- 하단: 오늘의 퀘스트 요약 카드 (완료/전체) + '전투 시작' FAB 버튼
- API 호출: useQuery(['timeline', today], () => mapApi.getTimeline(today))
- Zustand: useTimelineStore (blocks, remainingMin, loading)
- Pull to Refresh 지원
```

```
[QUEST] 퀘스트 보드 + 등록 화면을 구현해줘.
(동일 패턴으로 각 화면별 별도 프롬프트)
```

```
[BATTLE] 전투 화면을 구현해줘. 가장 복잡한 화면이니 신경 써서.
- AppState API로 앱 이탈 감지
- react-native-reanimated으로 몬스터 공격/피격 애니메이션
- expo-haptics로 보상 시 진동
- 콤보 게이지 UI (5단계)
- 타이머 + 이탈 경고 오버레이
(상세 스펙 제공)
```

```
[SKY] 감정 날씨 기록 + 캘린더 화면을 구현해줘.
(상세 스펙 제공)
```

```
[GATE] 온보딩 (스크리닝 + 캐릭터 생성) 화면을 구현해줘.
(상세 스펙 제공)
```

---

## 실전 팁

### 1. 에러 발생 시
```
방금 만든 코드에서 빌드 에러가 나. 에러 메시지:
{에러 메시지 붙여넣기}
이 에러를 수정해줘.
```

### 2. 테스트 요청
```
{모듈}Service의 단위 테스트를 작성해줘.
JUnit 5 + Mockito 사용. 정상 케이스와 예외 케이스 모두 포함.
```

### 3. 코드 리뷰 요청
```
지금까지 작성된 backend/src/main/java/com/brainquest/ 코드 전체를 리뷰해줘.
- 누락된 에러 처리
- N+1 쿼리 문제 (fetch join 필요한 곳)
- 트랜잭션 경계 문제
- 이벤트 리스너 중복 경험치 문제
- 보안 취약점
을 중점적으로 확인하고 수정해줘.
```

### 4. CLAUDE.md 업데이트
각 Phase 완료 후:
```
CLAUDE.md의 진행 상태를 업데이트해줘. Phase {N} 완료로 체크해줘.
```

### 5. 프론트엔드 디자인
```
이 화면의 UI를 좀 더 예쁘게 다듬어줘.
- 다크 배경(#0F0A2A) + 네온 악센트 RPG 느낌
- 폰트: Pretendard (Malgun Gothic 절대 사용 금지)
- 카드 기반 레이아웃, borderRadius: 12, 그림자
```

---

## 개발 순서 요약

```
Phase 0:  프로젝트 초기 세팅 + CLAUDE.md .............. Day 1
Phase 1:  백엔드 공통 + 인증 (Temurin JDK 21) ......... Day 2-3
Phase 2:  GATE 모듈 (스크리닝/체크인/약물/스트릭) ....... Day 4-5
Phase 3:  CHARACTER 모듈 (캐릭터/경험치/아이템) ........ Day 6-7
Phase 4:  QUEST 모듈 (AI 퀘스트 변환/체크포인트) ....... Day 8-10
Phase 5:  BATTLE 모듈 (전투 상태머신/보상/이탈) ........ Day 11-13
Phase 6:  MAP 모듈 (타임블록/시간예측) ................ Day 14-15
Phase 7:  SKY 모듈 (감정 기록/캘린더/주간요약) ......... Day 16-17
Phase 8:  이벤트 버스 통합 (모듈 간 연동 완성) ......... Day 18-19
Phase 9:  프론트엔드 (화면별 순차 구현) ............... Day 20-35
Phase 10: 통합 테스트 + 버그 수정 + 출시 .............. Day 36-40
```

---

## 주의사항

1. **절대 한 번에 전체를 시키지 마세요** — "전체 프로젝트를 만들어줘"는 실패합니다
2. **Phase 완료 후 반드시 빌드/테스트 확인** — 다음 Phase에서 에러가 눈덩이됩니다
3. **CLAUDE.md를 항상 최신으로 유지** — Claude Code의 기억력입니다
4. **설계서 PDF를 첫 프롬프트에서 읽게 하세요** — 정확도가 극적으로 올라갑니다
5. **프론트엔드는 가장 마지막에** — API가 완성된 후 작업해야 재작업이 없습니다
6. **복잡한 화면(전투, 타임라인)은 별도 프롬프트** — 한 화면에 집중시켜야 품질이 나옵니다
7. **Oracle JDK 사용 금지** — 반드시 Eclipse Temurin (Adoptium) OpenJDK 21 사용
8. **Redis 사용 금지** — Valkey 8 사용 (BSD-3, Redis 100% 호환)
9. **Malgun Gothic 사용 금지** — Pretendard 사용 (SIL OFL 1.1, 상용 무료)

---

## 라이선스 검증 요약

| 구분 | 총 항목 | 라이선스 |
|------|---------|----------|
| JDK | Eclipse Temurin 21 | GPLv2+CE ✅ |
| Backend 프레임워크 | Spring Boot 3.3 | Apache 2.0 ✅ |
| DB | PostgreSQL 16 | PostgreSQL License ✅ |
| 캐시 | Valkey 8 | BSD-3 ✅ |
| 빌드 | Gradle | Apache 2.0 ✅ |
| 마이그레이션 | Flyway Community | Apache 2.0 ✅ |
| JWT | jjwt 0.12.x | Apache 2.0 ✅ |
| API 문서 | springdoc-openapi | Apache 2.0 ✅ |
| 코드 생성 | Lombok | MIT ✅ |
| Frontend | React Native + Expo | MIT ✅ |
| 상태 관리 | Zustand | MIT ✅ |
| API 캐싱 | React Query | MIT ✅ |
| 애니메이션 | Reanimated + Lottie | MIT + Apache 2.0 ✅ |
| SVG | react-native-svg | MIT ✅ |
| HTTP | Axios | MIT ✅ |
| 스토리지 | MMKV | MIT ✅ |
| 날짜 | date-fns | MIT ✅ |
| 폰트 | Pretendard | SIL OFL 1.1 ✅ |
| 컨테이너 | Docker CE | Apache 2.0 ✅ |
| 웹서버 | Nginx | BSD-2 ✅ |
