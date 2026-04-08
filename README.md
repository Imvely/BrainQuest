<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/Java-21%20(Temurin)-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/React%20Native-Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude%20API-Anthropic-6C5CE7?style=for-the-badge" />
</p>

<h1 align="center">🧠 BrainQuest</h1>
<h3 align="center">ADHD를 위한 올인원 라이프 RPG</h3>

<p align="center">
  집중이 전투가 되고, 할 일이 퀘스트가 되고, 감정이 날씨가 되는 곳.<br/>
  당신의 하루를 모험으로 만들어 드립니다.
</p>

---

## 💡 프로젝트 소개

**BrainQuest**는 ADHD 사용자의 하루 전체를 하나의 RPG 모험으로 만드는 올인원 라이프 관리 앱입니다.

ADHD의 핵심 어려움인 **시간 맹시**, **실행 기능 장애**, **감정 조절 곤란**, **도파민 부족**을 5개의 유기적으로 연결된 모듈로 해결합니다.

> 한국 성인 ADHD 환자 12.2만 명(2024), 5년간 385% 급증.  
> 그런데 한국어 네이티브 ADHD 전문 앱은 아직 없습니다.

---

## 🎮 5개 핵심 모듈

| 모듈 | 이름 | 역할 | 핵심 기능 |
|:---:|------|------|----------|
| 🚪 | **GATE** | 진입 관문 | ADHD 자가 스크리닝(ASRS), 일일 체크인, 약물/수면 추적, 진료용 리포트 |
| 🗺️ | **MAP** | 메인 허브 | 24시간 원형 타임라인, 시간 블록 관리, 시간 예측 트레이닝, 전환 알림 |
| ⚔️ | **QUEST** | 행동 엔진 | AI 퀘스트 변환(할 일 → 판타지 퀘스트), 과업 자동 분해, 그룹 레이드 |
| 🛡️ | **BATTLE** | 집중 모드 | 포모도로 × RPG 전투, 콤보 시스템, 이탈 감지/반격, 길드 바디더블링 |
| 🌤️ | **SKY** | 감정 케어 | 감정 날씨 기록, AI 감정 폭풍 예보, CBT 리프레이밍 카드 |

### 모듈 간 연동 — 하루의 흐름

```
07:00 [GATE] 아침 체크인 → [MAP] AI 타임라인 생성 → [SKY] 감정 기록
09:00 [MAP] 첫 블록 → [QUEST] 퀘스트 선택 → [BATTLE] 전투 시작!
09:25 [BATTLE] 몬스터 격파 → [QUEST] 체크포인트 클리어 → 캐릭터 레벨업!
15:00 [SKY] 감정 흐림 감지 → [BATTLE] AI가 힐링 던전 추천
22:00 [GATE] 저녁 체크인 → 하루 요약 → 오늘의 전투 전적 확인
```

---

## 🏗️ 기술 스택

> 모든 기술은 **상용 무료 오픈소스** 라이선스 검증 완료

### Backend
| 기술 | 버전 | 라이선스 |
|------|------|---------|
| Spring Boot | 3.3 | Apache 2.0 |
| Eclipse Temurin OpenJDK | 21 | GPLv2+CE |
| PostgreSQL | 16 | PostgreSQL License |
| Valkey | 8 | BSD-3 |
| Flyway | Community | Apache 2.0 |
| jjwt | 0.12.x | Apache 2.0 |
| Gradle | 8.x | Apache 2.0 |

### Frontend
| 기술 | 버전 | 라이선스 |
|------|------|---------|
| React Native (Expo) | SDK 51+ | MIT |
| TypeScript | 5.x | Apache 2.0 |
| Zustand | 4.x | MIT |
| TanStack React Query | 5.x | MIT |
| React Native Reanimated | 3.x | MIT |
| Lottie React Native | 6.x | Apache 2.0 |
| Pretendard 폰트 | - | SIL OFL 1.1 |

### AI & Infra
| 기술 | 용도 |
|------|------|
| Claude API (Anthropic) | 퀘스트 변환, 과업 분해, CBT 리프레이밍 |
| Whisper API | 음성 입력 전사 |
| Firebase Auth / FCM | 소셜 로그인, 푸시 알림 |
| Docker | 로컬 개발 환경 |
| AWS (EC2 / RDS) | 프로덕션 인프라 |

---

## 📁 프로젝트 구조

```
brainquest/
├── backend/                        # Spring Boot API 서버
│   └── src/main/java/com/brainquest/
│       ├── auth/                   # JWT + 소셜 로그인
│       ├── gate/                   # [GATE] 스크리닝, 체크인, 약물
│       ├── map/                    # [MAP] 타임블록, 시간 예측
│       ├── quest/                  # [QUEST] AI 퀘스트, 체크포인트
│       ├── battle/                 # [BATTLE] 전투 세션
│       ├── sky/                    # [SKY] 감정 날씨
│       ├── character/              # 캐릭터, 경험치, 아이템
│       ├── event/                  # 모듈 간 이벤트 버스
│       └── common/                 # 공통 (BaseEntity, ApiResponse 등)
├── frontend/                       # React Native (Expo)
│   └── src/
│       ├── screens/                # 화면별 컴포넌트
│       ├── components/             # 재사용 UI 컴포넌트
│       ├── stores/                 # Zustand 상태 관리
│       ├── api/                    # Axios API 클라이언트
│       └── hooks/                  # React Query 커스텀 훅
├── docs/                           # 설계 문서
├── docker-compose.yml              # PostgreSQL + Valkey 로컬 환경
├── CLAUDE.md                       # AI 개발 어시스턴트 컨텍스트
└── README.md
```

---

## 🚀 시작하기

### 사전 요구사항

- [Eclipse Temurin OpenJDK 21](https://adoptium.net/) (Oracle JDK 사용 금지)
- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Expo CLI](https://docs.expo.dev/)

### 1. 클론

```bash
git clone https://github.com/Imvely/BrainQuest.git
cd BrainQuest
```

### 2. 로컬 DB 실행

```bash
docker-compose up -d
```

PostgreSQL(5432)과 Valkey(6379)가 실행됩니다.

### 3. 백엔드 실행

```bash
cd backend
./gradlew bootRun
```

API 서버: http://localhost:8080  
Swagger UI: http://localhost:8080/swagger-ui/index.html

### 4. 프론트엔드 실행

```bash
cd frontend
npm install
npx expo start
```

---

## 📊 게이미피케이션 시스템

### 캐릭터 스탯 — 모든 행동이 성장으로

| 스탯 | 상승 모듈 | 설명 |
|------|----------|------|
| ⚔️ 전투력 (ATK) | BATTLE | 집중 세션 완료 시 상승 |
| 📚 지혜 (WIS) | QUEST | 퀘스트 클리어 시 상승 |
| 🛡️ 멘탈 아머 (DEF) | SKY | 감정 기록, CBT 카드 완료 시 상승 |
| ⚡ 시간 감각 (AGI) | MAP | 시간 예측 정확도 향상 시 상승 |
| ❤️ 체력 (HP) | GATE | 체크인, 약물 기록, 수면 관리 시 상승 |

### 퀘스트 등급

| 등급 | 시간 | 경험치 | 골드 | 몬스터 | 아이템 드롭 |
|:---:|------|:-----:|:----:|--------|:---------:|
| E | ≤10분 | 10 | 5 | 🟢 슬라임 | 5% |
| D | ≤30분 | 25 | 15 | 🟡 고블린 | 10% |
| C | ≤60분 | 50 | 30 | 🟠 오크 | 20% |
| B | ≤120분 | 100 | 60 | 🔴 드래곤 | 35% |
| A | >120분 | 200 | 120 | 👿 마왕 | 50% |

---

## 🗓️ 개발 로드맵

- [x] Phase 0: 프로젝트 초기 세팅
- [ ] Phase 1: 백엔드 공통 + JWT 인증
- [ ] Phase 2: GATE 모듈 (스크리닝/체크인/약물)
- [ ] Phase 3: CHARACTER 모듈 (캐릭터/경험치/아이템)
- [ ] Phase 4: QUEST 모듈 (AI 퀘스트 변환)
- [ ] Phase 5: BATTLE 모듈 (전투 상태머신)
- [ ] Phase 6: MAP 모듈 (타임라인)
- [ ] Phase 7: SKY 모듈 (감정 날씨)
- [ ] Phase 8: 이벤트 버스 통합
- [ ] Phase 9: 프론트엔드
- [ ] Phase 10: 통합 테스트 + 출시

---

## 📄 라이선스

이 프로젝트의 모든 기술 스택은 상용 무료 오픈소스(MIT / Apache 2.0 / BSD / SIL OFL) 라이선스를 사용합니다.

- ❌ Oracle JDK → ✅ Eclipse Temurin OpenJDK
- ❌ Redis (SSPL) → ✅ Valkey (BSD-3)
- ❌ Malgun Gothic → ✅ Pretendard (SIL OFL 1.1)

---

## 🤝 기여

현재 개인 사이드 프로젝트로 개발 중입니다.  
피드백이나 아이디어가 있으시면 [Issues](https://github.com/Imvely/BrainQuest/issues)에 남겨주세요.

---

<p align="center">
  <b>ADHD는 의지력의 문제가 아닙니다. 구조의 문제입니다.</b><br/>
  BrainQuest가 그 구조를 만들어 드립니다.
</p>
