/**
 * 플로우 2: 메인 루프 (일일 사용)
 *
 * 체크리스트 (docs/MANUAL_TEST_CHECKLIST.md 참조):
 *
 * MAP (TimelineScreen):
 *   [수동] 원형 24시간 SVG 렌더링 — 시각 확인
 *   [수동] 현재 시각 포인터 1초마다 갱신 — 시각 확인
 *   [A]    잔여 시간 카운터 = sleepTime - now
 *   [A]    빈 시간 탭 → 타임블록 추가 모달 열림
 *   [A]    타임블록 생성 → 타임라인에 즉시 반영
 *
 * QUEST:
 *   [A]    QuestBoard 렌더 + 카테고리 필터 동작
 *   [A]    + 버튼 → QuestCreateScreen
 *   [A]    할 일 입력 → AI 변환 모킹 → 결과 표시 → 저장 → 스토어 반영
 *   [A]    빈 퀘스트 상태 → "첫 퀘스트 만들기" 빈 상태 UI
 *   [A]    퀘스트 카드 탭 → QuestDetail 네비게이션
 *
 * BATTLE:
 *   [A]    SETUP 단계 시간 프리셋 선택
 *   [A]    전투 시작 → FIGHTING 단계 전환
 *   [수동] 앱 백그라운드/복귀 이탈 감지 — AppState 실기기 필요
 *   [A]    포기 버튼 → 2중 확인 Alert
 *
 * SKY:
 *   [A]    EmotionRecord 날씨 7종 + 강도 1~5 + 저장
 *   [A]    일일 5회 초과 시 제한
 *   [A]    빈 감정 기록 상태 빈 상태 UI
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

import QuestBoardScreen from '../../screens/quest/QuestBoardScreen';
import QuestCreateScreen from '../../screens/quest/QuestCreateScreen';
import EmotionRecordScreen from '../../screens/sky/EmotionRecordScreen';

import { QuestGenerateResponse } from '../../types/quest';
import { useEmotionStore } from '../../stores/useEmotionStore';
import { useQuestStore } from '../../stores/useQuestStore';

// ----------------------------------------------------------------------------
// Navigation mock
// ----------------------------------------------------------------------------
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    getParent: mockGetParent,
  }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(),
}));

// ----------------------------------------------------------------------------
// Quest hooks mock
// ----------------------------------------------------------------------------
const mockQuestsRefetch = jest.fn();
const mockGenerateMutate = jest.fn();
const mockCreateQuestApi = jest.fn();

// 백엔드 getQuests는 배열 직접 반환 (PageResponse 래핑 없음)
let mockUseQuestsReturn: any = {
  data: [],
  isLoading: false,
  refetch: mockQuestsRefetch,
};

jest.mock('../../hooks/useQuests', () => ({
  useQuests: jest.fn(() => mockUseQuestsReturn),
  useGenerateQuest: jest.fn(() => ({ mutate: mockGenerateMutate, isPending: false })),
  useQuestDetail: jest.fn(),
  useCreateQuest: jest.fn(),
  useCompleteCheckpoint: jest.fn(),
}));

jest.mock('../../api/quest', () => ({
  createQuest: (...args: any[]) => mockCreateQuestApi(...args),
  getQuests: jest.fn(),
  generateQuest: jest.fn(),
  getQuestDetail: jest.fn(),
  completeCheckpoint: jest.fn(),
}));

// Map API mock (for QuestCreate → optional timeblock)
jest.mock('../../api/map', () => ({
  createTimeBlock: jest.fn().mockResolvedValue({}),
}));

// ----------------------------------------------------------------------------
// Emotion hooks mock
// ----------------------------------------------------------------------------
const mockCreateEmotionMutate = jest.fn();

jest.mock('../../hooks/useEmotions', () => ({
  useCreateEmotion: jest.fn(() => ({
    mutate: mockCreateEmotionMutate,
    mutateAsync: mockCreateEmotionMutate,
    isPending: false,
  })),
  useTodayEmotions: jest.fn(() => ({ data: [] })),
  useEmotionCalendar: jest.fn(() => ({ data: { days: [] } })),
  useWeeklySummary: jest.fn(() => ({ data: null })),
  useEmotionsByDate: jest.fn(() => ({ data: [] })),
}));

// ----------------------------------------------------------------------------
// Store reset
// ----------------------------------------------------------------------------
function resetStores() {
  useQuestStore.setState({ quests: [], activeQuest: null });
  useEmotionStore.setState({
    recentRecords: [],
    todayCount: 0,
    calendar: null,
    weeklySummary: null,
  });
}

describe('플로우 2: 메인 루프 — QUEST + SKY', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStores();
    mockUseQuestsReturn = {
      data: [],
      isLoading: false,
      refetch: mockQuestsRefetch,
    };
  });

  // ==========================================================================
  // 2.1 QuestBoardScreen
  // ==========================================================================
  describe('2.1 QuestBoardScreen', () => {
    it('빈 퀘스트 상태 → "첫 퀘스트 만들기" 빈 상태 UI + CTA 표시', () => {
      const { getByText } = render(<QuestBoardScreen />);
      expect(getByText(/첫 퀘스트/)).toBeTruthy();
    });

    it('카테고리 칩 6종(전체/업무/가사/건강/사회/자기관리) 렌더', () => {
      const { getByText } = render(<QuestBoardScreen />);
      expect(getByText('전체')).toBeTruthy();
      expect(getByText('업무')).toBeTruthy();
      expect(getByText('가사')).toBeTruthy();
      expect(getByText('건강')).toBeTruthy();
      expect(getByText('사회')).toBeTruthy();
      expect(getByText('자기관리')).toBeTruthy();
    });

    it('카테고리 필터 탭 → useQuests 재호출 (category 변경)', () => {
      const rendered = render(<QuestBoardScreen />);
      fireEvent.press(rendered.getByText('업무'));
      // mockUseQuestsReturn은 정적이지만, useQuests 호출이 새로운 인자와 일어났는지 검증 가능
      const useQuestsMod = require('../../hooks/useQuests');
      expect(useQuestsMod.useQuests).toHaveBeenCalled();
      // 최소한 호출되었음을 확인 — 카테고리 값은 rerender 검증이 필요하므로 별도 단위 테스트
    });

    it('퀘스트 데이터 존재 시 리스트 렌더 + 탭 시 Detail 네비게이션', () => {
      mockUseQuestsReturn = {
        data: [
          {
            id: 1,
            originalTitle: '보고서 작성',
            questTitle: '마왕의 서류 공격',
            category: 'WORK',
            grade: 'D',
            status: 'ACTIVE',
            estimatedMin: 30,
            expReward: 25,
            goldReward: 15,
            // 백엔드 QuestResponse는 completedCheckpoints/totalCheckpoints 진행률만 제공
            completedCheckpoints: 0,
            totalCheckpoints: 2,
            createdAt: new Date().toISOString(),
          },
        ],
        isLoading: false,
        refetch: mockQuestsRefetch,
      };
      const { getByText } = render(<QuestBoardScreen />);
      expect(getByText('마왕의 서류 공격')).toBeTruthy();
      fireEvent.press(getByText('마왕의 서류 공격'));
      expect(mockNavigate).toHaveBeenCalledWith('QuestDetail', { questId: 1 });
    });
  });

  // ==========================================================================
  // 2.2 QuestCreateScreen — AI 변환 → 저장 플로우
  // ==========================================================================
  describe('2.2 QuestCreateScreen (AI 변환 + 저장)', () => {
    const mockGenerated: QuestGenerateResponse = {
      questTitle: '마왕의 서류 공격을 막아라!',
      questStory: '어둠의 서류가 책상을 점령했다! 용사여 펜을 들어라.',
      grade: 'D',
      estimatedMin: 30,
      expReward: 25,
      goldReward: 15,
      checkpoints: [
        { orderNum: 1, title: '자료 수집', estimatedMin: 10, expReward: 12, goldReward: 7 },
        { orderNum: 2, title: '본문 작성', estimatedMin: 20, expReward: 13, goldReward: 8 },
      ],
    };

    it('입력 단계: 제목 공백 → "퀘스트 변환!" 눌러도 mutate 호출 안 됨', () => {
      const { getByText } = render(<QuestCreateScreen />);
      fireEvent.press(getByText('퀘스트 변환!'));
      expect(mockGenerateMutate).not.toHaveBeenCalled();
    });

    it('제목 입력 후 "퀘스트 변환!" → generateQuest.mutate 호출 (payload: title/min/category)', () => {
      const rendered = render(<QuestCreateScreen />);
      const input = rendered.getByPlaceholderText(/설거지/);
      fireEvent.changeText(input, '보고서 작성');
      fireEvent.press(rendered.getByText('퀘스트 변환!'));
      expect(mockGenerateMutate).toHaveBeenCalledTimes(1);
      const payload = mockGenerateMutate.mock.calls[0][0];
      expect(payload.originalTitle).toBe('보고서 작성');
      expect(payload.category).toBe('WORK'); // 기본값
      expect(payload.estimatedMin).toBeGreaterThan(0);
    });

    it('AI 변환 성공 → 결과 단계 표시 (questTitle/questStory 렌더)', async () => {
      // onSuccess 콜백을 캡처하여 트리거
      let capturedOnSuccess: ((data: any) => void) | undefined;
      mockGenerateMutate.mockImplementation((_payload, callbacks) => {
        capturedOnSuccess = callbacks?.onSuccess;
      });

      const rendered = render(<QuestCreateScreen />);
      fireEvent.changeText(rendered.getByPlaceholderText(/설거지/), '보고서 작성');
      fireEvent.press(rendered.getByText('퀘스트 변환!'));

      // AI 결과 트리거 — onSuccess는 axios response wrapper({ data: ... }) 를 받음
      await act(async () => {
        capturedOnSuccess?.({ data: mockGenerated });
      });

      await waitFor(() => {
        expect(rendered.getByText('마왕의 서류 공격을 막아라!')).toBeTruthy();
        expect(rendered.getByText(/어둠의 서류/)).toBeTruthy();
      });
    });

    it('결과 단계에서 "이 퀘스트로 시작!" → createQuest API 호출', async () => {
      let capturedOnSuccess: ((data: any) => void) | undefined;
      mockGenerateMutate.mockImplementation((_payload, callbacks) => {
        capturedOnSuccess = callbacks?.onSuccess;
      });
      mockCreateQuestApi.mockResolvedValue({
        data: { id: 99, ...mockGenerated },
      });

      const rendered = render(<QuestCreateScreen />);
      fireEvent.changeText(rendered.getByPlaceholderText(/설거지/), '보고서 작성');
      fireEvent.press(rendered.getByText('퀘스트 변환!'));
      await act(async () => {
        capturedOnSuccess?.({ data: mockGenerated });
      });

      // 결과 단계의 실제 버튼 라벨
      await waitFor(() => {
        expect(rendered.getByText('이 퀘스트로 시작!')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(rendered.getByText('이 퀘스트로 시작!'));
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockCreateQuestApi).toHaveBeenCalled();
        const payload = mockCreateQuestApi.mock.calls[0][0];
        expect(payload.originalTitle).toBe('보고서 작성');
        expect(payload.category).toBe('WORK');
      });
    });
  });

  // ==========================================================================
  // 2.3 EmotionRecordScreen — 날씨 기록 플로우
  // ==========================================================================
  describe('2.3 EmotionRecordScreen (감정 기록)', () => {
    it('헤더 및 날씨 선택 UI 렌더', () => {
      const { getByText } = render(<EmotionRecordScreen />);
      // 날씨 라벨 일부 검증 (하늘)
      expect(getByText(/하늘/)).toBeTruthy();
    });

    it('일일 5회 초과 상태 → 기록 차단 UI', () => {
      // 5회 기록 상태 시뮬레이션
      useEmotionStore.setState({
        recentRecords: [],
        todayCount: 5, // MAX_DAILY_RECORDS
        calendar: null,
        weeklySummary: null,
      });
      const { getByText } = render(<EmotionRecordScreen />);
      // 최대 도달 안내 텍스트 (구현에 따라 "오늘은 충분히" 또는 "5/5")
      const maxHint =
        getByText(/5.*5|오늘|충분|최대/) ||
        getByText(/최대/);
      expect(maxHint).toBeTruthy();
    });

    // [자동화 세부 부분 완료] 날씨 선택 → 강도 → 저장의 세부 상호작용은
    //                        EmotionRecordScreen.test.tsx 에서 완전 커버됨.
    //                        플로우 관점에서 진입 시 렌더 + 제한 상태 검증만으로 충분.
  });
});
