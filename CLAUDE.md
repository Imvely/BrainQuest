# BrainQuest — ADHD를 위한 올인원 라이프 RPG

## 프로젝트 개요
- ADHD 사용자의 하루를 RPG 모험으로 만드는 올인원 라이프 관리 앱
- 5개 모듈: GATE(스크리닝/추적) + MAP(타임라인) + QUEST(AI 퀘스트) + BATTLE(집중 RPG) + SKY(감정 날씨)
- MVP 범위로 개발 중

## 기술 스택
- Backend: Spring Boot 3.3 + Eclipse Temurin OpenJDK 21 + PostgreSQL 16 + Valkey 8 + Gradle
- Frontend: React Native (Expo SDK 51+) + TypeScript + Zustand + React Query
- AI: Claude API (퀘스트 변환/과업 분해) + Whisper API 또는 whisper.cpp (음성 전사)
- Font: Pretendard (SIL OFL 1.1, 상용 무료)
- Infra: Docker + AWS (EC2/RDS) + Firebase (Auth/FCM)
- 모든 라이브러리는 MIT, Apache 2.0, BSD, PostgreSQL License 등 상용 무료 오픈소스만 사용
- JDK는 반드시 Eclipse Temurin (Adoptium) 사용. Oracle JDK 사용 금지
- Redis 대신 Valkey 사용 (Redis는 SSPL 라이선스로 변경됨)

## 디렉토리 구조
```
brainquest/
├── backend/                          # Spring Boot API 서버
│   └── src/main/java/com/brainquest/
│       ├── auth/                     # 인증 (JWT + 소셜 로그인)
│       │   ├── controller/
│       │   ├── service/
│       │   ├── dto/
│       │   ├── entity/
│       │   ├── repository/
│       │   └── security/            # JwtTokenProvider, JwtAuthFilter, SecurityConfig
│       ├── gate/                     # [GATE] 스크리닝, 체크인, 약물 추적
│       │   ├── controller/
│       │   ├── service/
│       │   ├── dto/
│       │   ├── entity/              # ScreeningResult, DailyCheckin, Medication, MedLog, Streak
│       │   └── repository/
│       ├── map/                      # [MAP] 타임블록, 시간 예측
│       │   ├── controller/
│       │   ├── service/
│       │   ├── dto/
│       │   ├── entity/              # TimeBlock, TimePrediction
│       │   └── repository/
│       ├── quest/                    # [QUEST] 퀘스트, 체크포인트
│       │   ├── controller/
│       │   ├── service/
│       │   ├── dto/
│       │   ├── entity/              # Quest, Checkpoint
│       │   ├── repository/
│       │   └── ai/                  # ClaudeApiClient (퀘스트 변환)
│       ├── battle/                   # [BATTLE] 전투 세션
│       │   ├── controller/
│       │   ├── service/
│       │   ├── dto/
│       │   ├── entity/              # BattleSession, BattleExit
│       │   └── repository/
│       ├── sky/                      # [SKY] 감정 날씨 기록
│       │   ├── controller/
│       │   ├── service/
│       │   ├── dto/
│       │   ├── entity/              # EmotionRecord
│       │   └── repository/
│       ├── character/                # 캐릭터 & 게이미피케이션
│       │   ├── controller/
│       │   ├── service/             # CharacterService (경험치, 레벨업, 아이템 드롭)
│       │   ├── dto/
│       │   ├── entity/              # Character, Item, UserItem
│       │   └── repository/
│       ├── event/                    # 이벤트 버스 (모듈 간 연동)
│       │   ├── events/              # 이벤트 클래스 정의
│       │   └── listeners/           # 이벤트 리스너 정의
│       ├── notification/             # 알림 시스템 (FCM)
│       │   └── service/
│       └── common/                   # 공통
│           ├── entity/              # BaseEntity
│           ├── dto/                 # ApiResponse
│           ├── exception/           # GlobalExceptionHandler, 커스텀 예외
│           └── config/              # JpaAuditingConfig, WebConfig, CorsConfig
│   └── src/main/resources/
│       ├── application.yml
│       ├── application-dev.yml
│       ├── application-prod.yml
│       └── db/migration/            # Flyway 마이그레이션 SQL
│           ├── V1__create_users.sql
│           ├── V2__create_characters.sql
│           ├── V3__create_screening_results.sql
│           ├── V4__create_daily_checkins.sql
│           ├── V5__create_medications_and_logs.sql
│           ├── V6__create_streaks.sql
│           ├── V7__create_items.sql
│           ├── V8__create_user_items.sql
│           ├── V9__create_quests.sql
│           ├── V10__create_checkpoints.sql
│           ├── V11__create_battle_sessions.sql
│           ├── V12__create_battle_exits.sql
│           ├── V13__create_time_blocks.sql
│           ├── V14__create_time_predictions.sql
│           └── V15__create_emotion_records.sql
├── frontend/                         # React Native (Expo)
│   └── src/
│       ├── screens/
│       │   ├── auth/                # LoginScreen
│       │   ├── onboarding/          # ScreeningScreen, CharacterCreateScreen
│       │   ├── map/                 # TimelineScreen (메인 홈)
│       │   ├── quest/               # QuestBoardScreen, QuestDetailScreen, QuestCreateScreen
│       │   ├── battle/              # BattleScreen, BattleResultScreen
│       │   ├── sky/                 # EmotionRecordScreen, EmotionCalendarScreen
│       │   ├── character/           # CharacterScreen, InventoryScreen
│       │   └── gate/                # CheckinScreen, MedicationScreen, ReportScreen
│       ├── components/
│       │   ├── common/              # Button, Card, Modal, Badge, ProgressBar
│       │   ├── timeline/            # CircularTimeline, TimeBlock, TimePointer
│       │   ├── battle/              # Monster, ComboGauge, HpBar, DamageEffect
│       │   ├── weather/             # WeatherIcon, WeatherPicker, WeatherCalendar
│       │   └── quest/               # QuestCard, CheckpointList, GradeIcon
│       ├── navigation/
│       │   ├── AuthStack.tsx
│       │   ├── MainTab.tsx
│       │   └── RootNavigator.tsx
│       ├── stores/                  # Zustand 상태 관리
│       │   ├── useAuthStore.ts
│       │   ├── useCharacterStore.ts
│       │   ├── useTimelineStore.ts
│       │   ├── useQuestStore.ts
│       │   ├── useBattleStore.ts
│       │   └── useEmotionStore.ts
│       ├── api/                     # API 클라이언트
│       │   ├── client.ts            # Axios 인스턴스 (baseURL, 인터셉터, JWT 자동 첨부)
│       │   ├── auth.ts
│       │   ├── gate.ts
│       │   ├── map.ts
│       │   ├── quest.ts
│       │   ├── battle.ts
│       │   ├── sky.ts
│       │   └── character.ts
│       ├── hooks/                   # React Query 훅
│       │   ├── useTimeline.ts
│       │   ├── useQuests.ts
│       │   ├── useBattle.ts
│       │   └── useEmotions.ts
│       ├── types/                   # TypeScript 타입 정의
│       │   ├── user.ts
│       │   ├── character.ts
│       │   ├── quest.ts
│       │   ├── battle.ts
│       │   ├── emotion.ts
│       │   ├── timeline.ts
│       │   └── api.ts               # ApiResponse<T> 제네릭
│       ├── constants/
│       │   ├── colors.ts            # PRIMARY=#6C5CE7, SECONDARY=#00CEC9, ACCENT=#FD79A8 등
│       │   ├── fonts.ts
│       │   ├── game.ts              # 난이도별 보상, 레벨 테이블, 몬스터 HP 등
│       │   └── weather.ts           # 날씨 타입 정의, 아이콘 매핑
│       └── utils/
│           ├── time.ts              # 시간 계산 유틸
│           ├── format.ts            # 포맷팅 유틸
│           └── storage.ts           # MMKV 래퍼
├── docs/                            # 설계 문서
│   ├── BrainQuest_MVP_상세_기술_설계서.pdf
│   └── BrainQuest_통합_ADHD앱_상세_기능_스토리.pdf
├── docker-compose.yml               # PostgreSQL + Redis 로컬 개발용
└── CLAUDE.md                        # 이 파일
```

## 데이터 모델 (전체 테이블 + 컬럼)

### users
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 사용자 ID |
| email | VARCHAR(255) | UNIQUE | 이메일 |
| nickname | VARCHAR(50) | NOT NULL | 닉네임 |
| provider | VARCHAR(20) | NOT NULL | KAKAO / APPLE / GOOGLE |
| provider_id | VARCHAR(255) | NOT NULL | 소셜 로그인 고유 ID |
| adhd_status | VARCHAR(20) | DEFAULT 'UNKNOWN' | UNKNOWN / UNDIAGNOSED / SUSPECTED / DIAGNOSED |
| diagnosis_date | DATE | nullable | ADHD 진단일 |
| timezone | VARCHAR(50) | DEFAULT 'Asia/Seoul' | 타임존 |
| wake_time | TIME | DEFAULT '07:00' | 기상 시간 |
| sleep_time | TIME | DEFAULT '23:00' | 취침 시간 |
| created_at | TIMESTAMP | NOT NULL | 가입일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

### characters
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 캐릭터 ID |
| user_id | BIGINT | FK→users, UNIQUE | 사용자 (1:1) |
| name | VARCHAR(30) | NOT NULL | 캐릭터 이름 |
| class_type | VARCHAR(20) | NOT NULL | WARRIOR / MAGE / RANGER |
| level | INT | DEFAULT 1 | 현재 레벨 |
| exp | INT | DEFAULT 0 | 현재 경험치 |
| exp_to_next | INT | DEFAULT 100 | 다음 레벨까지 필요 경험치 |
| stat_atk | INT | DEFAULT 10 | 전투력 (BATTLE 기반) |
| stat_wis | INT | DEFAULT 10 | 지혜 (QUEST 기반) |
| stat_def | INT | DEFAULT 10 | 멘탈 아머 (SKY 기반) |
| stat_agi | INT | DEFAULT 10 | 시간 감각 (MAP 기반) |
| stat_hp | INT | DEFAULT 100 | 체력 (GATE 기반) |
| gold | INT | DEFAULT 0 | 보유 골드 |
| appearance | JSONB | NOT NULL | {hair: "style1", outfit: "outfit1", color: "#FF0000"} |
| equipped_items | JSONB | DEFAULT '{}' | {helmet: null, armor: null, weapon: null, accessory: null} |

### screening_results
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 스크리닝 ID |
| user_id | BIGINT | FK→users | 사용자 |
| test_type | VARCHAR(10) | NOT NULL | ASRS_6 / ASRS_18 |
| answers | JSONB | NOT NULL | {q1: 3, q2: 4, q3: 2, q4: 5, q5: 3, q6: 4} |
| total_score | INT | NOT NULL | 총점 |
| risk_level | VARCHAR(10) | NOT NULL | LOW / MEDIUM / HIGH |
| created_at | TIMESTAMP | NOT NULL | 검사일시 |

### daily_checkins
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 체크인 ID |
| user_id | BIGINT | FK→users | 사용자 |
| checkin_type | VARCHAR(10) | NOT NULL | MORNING / EVENING |
| checkin_date | DATE | NOT NULL | 체크인 날짜 |
| sleep_hours | DECIMAL(3,1) | nullable | 수면 시간 (MORNING만) |
| sleep_quality | INT | nullable | 수면 질 1-3 (MORNING만) |
| condition | INT | nullable | 컨디션 1-5 (MORNING만) |
| focus_score | INT | nullable | 집중력 1-5 (EVENING만) |
| impulsivity_score | INT | nullable | 충동성 1-5 (EVENING만) |
| emotion_score | INT | nullable | 감정 안정도 1-5 (EVENING만) |
| memo | TEXT | nullable | 한 줄 메모 |
| created_at | TIMESTAMP | NOT NULL | 기록일시 |
| UNIQUE(user_id, checkin_date, checkin_type) | | | 날짜+타입 중복 방지 |

### medications
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 약물 ID |
| user_id | BIGINT | FK→users | 사용자 |
| med_name | VARCHAR(100) | NOT NULL | 약물명 (콘서타, 메디키넷 등) |
| dosage | VARCHAR(50) | NOT NULL | 용량 (예: 27mg) |
| schedule_time | TIME | NOT NULL | 복용 예정 시간 |
| is_active | BOOLEAN | DEFAULT true | 현재 복용 중 여부 |
| created_at | TIMESTAMP | NOT NULL | 등록일시 |

### med_logs
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 복용 기록 ID |
| medication_id | BIGINT | FK→medications | 약물 |
| user_id | BIGINT | FK→users | 사용자 |
| log_date | DATE | NOT NULL | 복용 날짜 |
| taken_at | TIMESTAMP | NOT NULL | 실제 복용 시각 |
| effectiveness | INT | nullable | 약효 평가 1-3 |
| side_effects | JSONB | nullable | ["식욕감소", "두통"] |
| created_at | TIMESTAMP | NOT NULL | 기록일시 |

### streaks
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 스트릭 ID |
| user_id | BIGINT | FK→users | 사용자 |
| streak_type | VARCHAR(20) | NOT NULL | CHECKIN / BATTLE / EMOTION / QUEST |
| current_count | INT | DEFAULT 0 | 현재 연속 일수 |
| max_count | INT | DEFAULT 0 | 역대 최대 연속 일수 |
| last_date | DATE | nullable | 마지막 기록 날짜 |
| UNIQUE(user_id, streak_type) | | | 사용자+타입 유니크 |

### items (마스터 데이터)
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 아이템 ID |
| name | VARCHAR(100) | NOT NULL | 아이템 이름 |
| description | TEXT | nullable | 아이템 설명 |
| slot | VARCHAR(15) | NOT NULL | HELMET / ARMOR / WEAPON / ACCESSORY |
| rarity | VARCHAR(10) | NOT NULL | COMMON / UNCOMMON / RARE / EPIC / LEGENDARY |
| stat_bonus | JSONB | NOT NULL | {atk: 5, def: 3, wis: 0, agi: 0, hp: 0} |
| image_url | VARCHAR(500) | nullable | 아이템 이미지 URL |

### user_items
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 사용자 아이템 ID |
| user_id | BIGINT | FK→users | 사용자 |
| item_id | BIGINT | FK→items | 아이템 |
| acquired_at | TIMESTAMP | NOT NULL | 획득일시 |
| source | VARCHAR(20) | NOT NULL | BATTLE_DROP / QUEST_REWARD / LEVEL_UP / SHOP |

### quests
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 퀘스트 ID |
| user_id | BIGINT | FK→users | 사용자 |
| original_title | VARCHAR(300) | NOT NULL | 원본 할 일 텍스트 |
| quest_title | VARCHAR(300) | NOT NULL | AI 변환된 퀘스트 제목 |
| quest_story | TEXT | NOT NULL | AI 생성 퀘스트 스토리 |
| category | VARCHAR(20) | NOT NULL | WORK / HOME / HEALTH / SOCIAL / SELF |
| grade | VARCHAR(5) | NOT NULL | E / D / C / B / A |
| estimated_min | INT | NOT NULL | 예상 소요 시간(분) |
| exp_reward | INT | NOT NULL | 총 경험치 보상 |
| gold_reward | INT | NOT NULL | 총 골드 보상 |
| status | VARCHAR(15) | DEFAULT 'ACTIVE' | ACTIVE / IN_PROGRESS / COMPLETED / ABANDONED |
| due_date | DATE | nullable | 마감일 |
| completed_at | TIMESTAMP | nullable | 완료일시 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |
| updated_at | TIMESTAMP | NOT NULL | 수정일시 |

### checkpoints
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 체크포인트 ID |
| quest_id | BIGINT | FK→quests | 퀘스트 |
| order_num | INT | NOT NULL | 순서 (1, 2, 3...) |
| title | VARCHAR(300) | NOT NULL | 체크포인트 제목 (AI 생성) |
| estimated_min | INT | NOT NULL | 예상 소요 시간(분) |
| exp_reward | INT | NOT NULL | 경험치 보상 |
| gold_reward | INT | NOT NULL | 골드 보상 |
| status | VARCHAR(15) | DEFAULT 'PENDING' | PENDING / IN_PROGRESS / COMPLETED |
| completed_at | TIMESTAMP | nullable | 완료일시 |

### battle_sessions
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 전투 세션 ID |
| user_id | BIGINT | FK→users | 사용자 |
| quest_id | BIGINT | FK→quests, nullable | 연결 퀘스트 |
| checkpoint_id | BIGINT | FK→checkpoints, nullable | 연결 체크포인트 |
| planned_min | INT | NOT NULL | 계획 세션 시간(분) |
| actual_min | INT | nullable | 실제 집중 시간(분) |
| monster_type | VARCHAR(30) | NOT NULL | 몬스터 종류 |
| monster_max_hp | INT | NOT NULL | 몬스터 시작 HP |
| monster_remaining_hp | INT | NOT NULL | 몬스터 잔여 HP |
| max_combo | INT | DEFAULT 0 | 최대 콤보 수 |
| exit_count | INT | DEFAULT 0 | 이탈 횟수 |
| total_exit_sec | INT | DEFAULT 0 | 총 이탈 시간(초) |
| result | VARCHAR(10) | nullable | VICTORY / DEFEAT / ABANDON |
| exp_earned | INT | DEFAULT 0 | 획득 경험치 |
| gold_earned | INT | DEFAULT 0 | 획득 골드 |
| item_drops | JSONB | nullable | [{itemId, name, rarity}] |
| started_at | TIMESTAMP | NOT NULL | 전투 시작 |
| ended_at | TIMESTAMP | nullable | 전투 종료 |

### battle_exits
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 이탈 기록 ID |
| session_id | BIGINT | FK→battle_sessions | 전투 세션 |
| exit_at | TIMESTAMP | NOT NULL | 이탈 시각 |
| return_at | TIMESTAMP | nullable | 복귀 시각 |
| duration_sec | INT | nullable | 이탈 시간(초) |
| penalty_type | VARCHAR(20) | NOT NULL | COMBO_RESET / HP_RECOVER / HP_DAMAGE / DEFEAT |

### time_blocks
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 타임블록 ID |
| user_id | BIGINT | FK→users | 사용자 |
| block_date | DATE | NOT NULL | 블록 날짜 |
| start_time | TIME | NOT NULL | 시작 시각 |
| end_time | TIME | NOT NULL | 종료 시각 |
| category | VARCHAR(20) | NOT NULL | WORK / HOME / HEALTH / SOCIAL / REST / CUSTOM |
| title | VARCHAR(200) | NOT NULL | 블록 제목 |
| quest_id | BIGINT | FK→quests, nullable | 연결 퀘스트 |
| status | VARCHAR(15) | DEFAULT 'PLANNED' | PLANNED / IN_PROGRESS / COMPLETED / SKIPPED |
| actual_start | TIMESTAMP | nullable | 실제 시작 |
| actual_end | TIMESTAMP | nullable | 실제 종료 |
| source | VARCHAR(15) | DEFAULT 'MANUAL' | MANUAL / AI_SUGGESTED / CALENDAR_SYNC |
| is_buffer | BOOLEAN | DEFAULT false | 버퍼(전환) 시간 여부 |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

### time_predictions
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 예측 ID |
| user_id | BIGINT | FK→users | 사용자 |
| block_id | BIGINT | FK→time_blocks | 타임블록 |
| predicted_min | INT | NOT NULL | 사용자 예측(분) |
| actual_min | INT | nullable | 실제 소요(분) |
| accuracy_pct | DECIMAL(5,2) | nullable | 정확도 % |
| created_at | TIMESTAMP | NOT NULL | 기록일시 |

### emotion_records
| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | BIGINT | PK, Auto | 감정 기록 ID |
| user_id | BIGINT | FK→users | 사용자 |
| weather_type | VARCHAR(15) | NOT NULL | SUNNY / PARTLY_CLOUDY / CLOUDY / FOG / RAIN / THUNDER / STORM |
| intensity | INT | NOT NULL | 강도 1-5 |
| tags | JSONB | nullable | ["회의후", "피곤", "RSD"] |
| memo | TEXT | nullable | 메모 |
| voice_url | VARCHAR(500) | nullable | 음성 메모 S3 URL |
| voice_transcript | TEXT | nullable | 음성 전사 텍스트 |
| recorded_at | TIMESTAMP | NOT NULL | 기록 시각 (사용자가 선택한 시각) |
| created_at | TIMESTAMP | NOT NULL | 생성일시 |

## API 패턴

- Base URL: `/api/v1`
- 인증: `Authorization: Bearer {JWT}` (Access Token 15분, Refresh Token 30일)
- 성공 응답: `{ "success": true, "data": {...}, "message": "..." }`
- 에러 응답: `{ "success": false, "error": { "code": "GATE_001", "message": "..." } }`
- 페이징: `?page=0&size=20&sort=createdAt,desc`

### 주요 엔드포인트
```
# Auth
POST   /api/v1/auth/login          # 소셜 로그인 → JWT 발급
POST   /api/v1/auth/refresh         # 토큰 갱신

# Gate
POST   /api/v1/gate/screening       # ASRS 스크리닝 제출
POST   /api/v1/gate/checkin          # 아침/저녁 체크인
GET    /api/v1/gate/checkin/history   # 체크인 기록 조회
POST   /api/v1/gate/medications      # 약물 등록
POST   /api/v1/gate/med-logs         # 복용 기록
GET    /api/v1/gate/streaks          # 스트릭 조회
GET    /api/v1/gate/report           # 진료용 리포트 PDF

# Map
GET    /api/v1/map/timeline/{date}   # 타임라인 조회 (블록+퀘스트+감정+전투 통합)
POST   /api/v1/map/blocks            # 타임블록 생성
PUT    /api/v1/map/blocks/{id}       # 타임블록 수정
DELETE /api/v1/map/blocks/{id}       # 타임블록 삭제
POST   /api/v1/map/predictions       # 시간 예측 기록
PUT    /api/v1/map/predictions/{id}/actual  # 실제 시간 기록

# Quest
POST   /api/v1/quest/generate        # AI 퀘스트 변환 (Claude API)
POST   /api/v1/quest                 # 퀘스트 저장
GET    /api/v1/quest                 # 퀘스트 목록 (?status=ACTIVE&category=WORK)
GET    /api/v1/quest/{id}            # 퀘스트 상세
PUT    /api/v1/quest/{id}/checkpoints/{cpId}/complete  # 체크포인트 완료

# Battle
POST   /api/v1/battle/start          # 전투 시작
POST   /api/v1/battle/{id}/exit      # 이탈 기록
POST   /api/v1/battle/{id}/return    # 복귀 기록
POST   /api/v1/battle/{id}/end       # 전투 종료
GET    /api/v1/battle/history        # 전투 기록

# Sky
POST   /api/v1/sky/emotions          # 감정 기록
GET    /api/v1/sky/calendar/{yearMonth}  # 월간 감정 지도
GET    /api/v1/sky/summary/weekly     # 주간 요약

# Character
GET    /api/v1/character              # 캐릭터 정보
PUT    /api/v1/character/equip        # 장비 장착
GET    /api/v1/character/items        # 인벤토리
```

## 핵심 비즈니스 로직

### 경험치 & 레벨업
- 레벨업 공식: `requiredExp = floor(50 * level^1.5)`
- 레벨업 시 보상: 골드 + 아이템 상자 (5레벨마다)
- 스탯별 경험치 분배: ATK(BATTLE), WIS(QUEST), DEF(SKY), AGI(MAP), HP(GATE)

### 퀘스트 난이도 & 보상
| 등급 | 시간 기준 | 경험치 | 골드 | 몬스터 HP | 아이템 드롭 |
|------|----------|--------|------|----------|------------|
| E | ≤10분 | 10 | 5 | 100 | 5% |
| D | ≤30분 | 25 | 15 | 300 | 10% |
| C | ≤60분 | 50 | 30 | 600 | 20% |
| B | ≤120분 | 100 | 60 | 1200 | 35% |
| A | >120분 | 200 | 120 | 2400 | 50% |

### 전투 콤보 & 이탈 페널티
- 콤보: 연속 5분 집중마다 combo++ (최대 5) → 데미지 배율 1.0~2.0
- 이탈 페널티:
  - ≤30초: 콤보 리셋만
  - 30~60초: 몬스터 HP 10% 회복
  - 60~120초: 캐릭터 HP 20% 감소
  - 120~300초: 캐릭터 HP 50% 감소
  - >300초: 자동 패배

### 스트릭 보너스
| 연속 일수 | 보너스 |
|----------|--------|
| 7일 | EXP +50 |
| 14일 | EXP +100 |
| 30일 | EXP +200 + 아이템 상자 |
| 60일 | EXP +500 + RARE 아이템 |
| 100일 | EXP +1000 + 전설 칭호 |

### 감정 날씨 수치 매핑
| 날씨 | 수치 | 설명 |
|------|------|------|
| SUNNY | 7 | 기쁨 |
| PARTLY_CLOUDY | 6 | 평온 |
| CLOUDY | 5 | 무기력 |
| FOG | 4 | 혼란 |
| RAIN | 3 | 슬픔 |
| THUNDER | 2 | 분노 |
| STORM | 1 | 폭발 |

## 모듈 간 이벤트 (Spring ApplicationEvent)

```
MorningCheckinEvent {userId, sleepHours, condition}
  발행: GATE → 구독: MAP, CHARACTER

EveningCheckinEvent {userId, focus, impulsivity, emotion}
  발행: GATE → 구독: CHARACTER

BattleCompletedEvent {userId, sessionId, result, expEarned, checkpointId}
  발행: BATTLE → 구독: QUEST(체크포인트 완료), CHARACTER(ATK 경험치), GATE(리포트 데이터)

QuestCompletedEvent {userId, questId, grade, expReward, goldReward}
  발행: QUEST → 구독: CHARACTER(WIS 경험치 + 아이템 드롭), MAP(타임블록 완료)

CheckpointCompletedEvent {userId, checkpointId, questId, expReward}
  발행: QUEST → 구독: CHARACTER(WIS 경험치)

EmotionRecordedEvent {userId, weatherType, intensity}
  발행: SKY → 구독: CHARACTER(DEF 경험치 +5)

LevelUpEvent {userId, newLevel, rewards}
  발행: CHARACTER → 구독: NOTIFICATION(축하 푸시)

StreakUpdatedEvent {userId, streakType, currentCount, isBonus}
  발행: GATE → 구독: CHARACTER(보너스 경험치/아이템)
```

## 현재 진행 상태

- [x] Phase 0: 프로젝트 초기 세팅 + CLAUDE.md
- [x] Phase 1: 백엔드 공통 + 인증 (JWT + 소셜 로그인)
- [x] Phase 2: GATE 모듈 (스크리닝, 체크인, 약물, 스트릭)
- [x] Phase 3: CHARACTER 모듈 (캐릭터, 경험치, 레벨업, 아이템)
- [x] Phase 4: QUEST 모듈 (AI 퀘스트 변환, 체크포인트, Claude API 연동)
- [x] Phase 5: BATTLE 모듈 (전투 상태머신, 콤보, 이탈 페널티, 보상)
- [ ] Phase 6: MAP 모듈 (타임블록 CRUD, 시간 예측, 전환 알림)
- [ ] Phase 7: SKY 모듈 (감정 기록, 월간 캘린더, 주간 요약)
- [ ] Phase 8: 이벤트 버스 통합 (모든 모듈 간 이벤트 연동)
- [ ] Phase 9: 프론트엔드 (화면별 순차 구현)
- [ ] Phase 10: 통합 테스트 + 버그 수정 + 출시

## 코딩 컨벤션

### Backend (Java/Spring)
- 패키지 구조: 모듈별 (gate, map, quest, battle, sky, character)
- Entity: Lombok @Getter @NoArgsConstructor(access = PROTECTED) @Builder
- DTO: Java Record 사용
- Repository: JpaRepository 상속, 커스텀 쿼리는 @Query
- Service: @Service @Transactional(readOnly = true), 변경 메서드만 @Transactional
- Controller: @RestController @RequestMapping, ResponseEntity<ApiResponse<T>>
- 예외: 커스텀 예외 클래스 + GlobalExceptionHandler
- 테스트: JUnit 5 + Mockito, 서비스 레이어 단위 테스트 필수

### Frontend (TypeScript/React Native)
- 컴포넌트: 함수형 컴포넌트 + TypeScript
- 상태: Zustand (전역), React Query (서버 상태)
- 스타일: StyleSheet.create (인라인 지양)
- 네이밍: PascalCase (컴포넌트), camelCase (함수/변수), UPPER_SNAKE (상수)
- API 호출: src/api/ 에 모듈별 분리, React Query 훅으로 래핑
