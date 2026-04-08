<p align="center">
  <img src="https://img.shields.io/badge/Spring%20Boot-3.3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" />
  <img src="https://img.shields.io/badge/Java-21%20(Temurin)-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" />
  <img src="https://img.shields.io/badge/React%20Native-Expo-000020?style=for-the-badge&logo=expo&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Claude%20API-Anthropic-6C5CE7?style=for-the-badge" />
</p>

# BrainQuest

ADHD 사용자를 위한 라이프 관리 앱. 집중, 할 일, 감정, 시간을 하나의 RPG 시스템으로 엮어서 ADHD의 실행 기능 장애를 구조적으로 해결합니다.

한국 성인 ADHD 환자가 12만 명을 넘었는데 한국어로 된 제대로 된 ADHD 앱이 없어서 만들기 시작했습니다.

## 왜 만드는가

ADHD의 핵심 문제는 **"해야 할 걸 알지만 시작을 못 하는 것"**입니다. 기존 생산성 앱은 이걸 해결 못 합니다. 할 일 목록을 예쁘게 정리해줘도, 정리된 목록을 보는 것 자체가 스트레스니까요.

BrainQuest는 접근 방식이 다릅니다.
- 할 일을 적으면 AI가 RPG 퀘스트로 바꿔줍니다. "설거지"가 "마왕의 식기 정화 퀘스트"가 됩니다.
- 집중하면 몬스터를 공격하고, 앱을 이탈하면 몬스터가 반격합니다.
- 감정을 날씨로 기록하면 AI가 패턴을 분석해서 "오후에 감정 폭풍이 올 수 있다"고 알려줍니다.
- 이 모든 데이터가 병원 진료 시 제출할 수 있는 리포트로 자동 생성됩니다.

포모도로 타이머 하나 만드는 게 아니라, ADHD 사용자의 하루 전체를 설계하는 앱입니다.

## 구조

5개 모듈이 독립적이면서 유기적으로 연결됩니다.

| 모듈 | 하는 일 |
|------|---------|
| **GATE** | ADHD 자가 스크리닝(WHO ASRS), 일일 증상 체크인, 약물/수면 추적, 진료용 PDF 리포트 |
| **MAP** | 하루를 원형 타임라인으로 시각화. 남은 시간이 실시간으로 줄어드는 걸 눈으로 봄. 시간 맹시 해소 |
| **QUEST** | 할 일을 입력하면 Claude API가 퀘스트로 변환 + 자동 분해. "큰 과업 앞에서 멍해지는 문제" 해결 |
| **BATTLE** | 포모도로 세션이 RPG 전투. 집중 시간=공격력, 앱 이탈=몬스터 반격. 콤보/장비/길드 시스템 |
| **SKY** | 감정을 날씨(맑음~폭풍)로 원탭 기록. AI가 감정 패턴 분석해서 폭풍 예보 제공. CBT 카드 포함 |

모듈 간 데이터가 흐릅니다. 아침 수면 데이터(GATE)가 오늘의 타임라인 배치(MAP)에 영향을 주고, 전투 완료(BATTLE)가 퀘스트 체크포인트(QUEST)를 자동으로 클리어하고, 감정 기록(SKY)이 전투 난이도 추천에 반영됩니다.

## 기술 스택

모든 기술은 상용 무료 오픈소스만 사용합니다. Oracle JDK, Redis(SSPL), 상용 폰트 등은 의도적으로 배제했습니다.

**Backend**: Spring Boot 3.3 / Eclipse Temurin OpenJDK 21 / PostgreSQL 16 / Valkey 8 / Flyway / Gradle

**Frontend**: React Native (Expo) / TypeScript / Zustand / React Query / Pretendard 폰트

**AI**: Claude API (퀘스트 변환, 과업 분해) / Whisper API (음성 전사)

**Infra**: Docker / AWS (EC2, RDS) / Firebase (Auth, FCM)

## 로컬 실행

```bash
# 클론
git clone https://github.com/Imvely/BrainQuest.git
cd BrainQuest

# DB 실행 (PostgreSQL + Valkey)
docker-compose up -d

# 백엔드
cd backend
./gradlew bootRun
# → http://localhost:8080
# → Swagger: http://localhost:8080/swagger-ui/index.html

# 프론트엔드
cd frontend
npm install
npx expo start
```

사전 요구: [Temurin JDK 21](https://adoptium.net/) / Node.js 20+ / Docker Desktop

## 개발 현황

- [x] 프로젝트 세팅
- [x] 백엔드 공통 + 인증
- [x] GATE (스크리닝/체크인/약물)
- [x] CHARACTER (캐릭터/경험치/아이템)
- [x] QUEST (AI 퀘스트 변환)
- [x] BATTLE (전투 시스템)
- [x] MAP (타임라인)
- [x] SKY (감정 날씨)
- [x] 모듈 간 이벤트 연동
- [ ] 프론트엔드
- [ ] 통합 테스트 + 출시

## 라이선스 관련

| 쓰지 않는 것 | 대신 쓰는 것 | 이유 |
|-------------|-------------|------|
| Oracle JDK | Eclipse Temurin | Oracle 라이선스 정책 불안정 |
| Redis | Valkey | 2024.03 SSPL 전환으로 오픈소스 아님 |
| 맑은 고딕 | Pretendard | MS 소유 폰트, 재배포 불가 |

---

개인 사이드 프로젝트입니다. 피드백은 [Issues](https://github.com/Imvely/BrainQuest/issues)에 남겨주세요.
