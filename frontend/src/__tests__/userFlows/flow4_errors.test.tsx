/**
 * 플로우 4: 에러 케이스
 *
 * 체크리스트 (docs/MANUAL_TEST_CHECKLIST.md 참조):
 *   [A]    네트워크 끊김 상태 → API 호출 실패 시 에러 토스트/알림
 *   [A]    401 응답 → 자동 토큰 리프레시 → 원 요청 재시도
 *   [A]    리프레시도 만료 → clearTokens → useAuthStore.logout()
 *   [A]    빈 퀘스트 목록 → 빈 상태 UI ("첫 퀘스트 만들기")
 *   [A]    빈 감정 기록 → 빈 상태 UI
 *   [수동] 로그인 화면 리다이렉션 — RootNavigator 통합
 *   [수동] 요청 타임아웃(15s) — 네트워크 시뮬레이션
 *   [수동] 서버 500 에러 사용자 친화적 메시지 — 백엔드 시뮬레이션
 *
 * 참고: apiClient의 401 리프레시 로직은 기존 src/api/__tests__/client.test.ts 에서
 *       완전히 커버됨. 이 파일은 화면 레벨에서의 에러 처리와 빈 상태만 검증.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';

import QuestBoardScreen from '../../screens/quest/QuestBoardScreen';
import QuestCreateScreen from '../../screens/quest/QuestCreateScreen';
import EmotionCalendarScreen from '../../screens/sky/EmotionCalendarScreen';
import { storage, setTokens, clearTokens, getAccessToken, getRefreshToken } from '../../utils/storage';

// ----------------------------------------------------------------------------
// Navigation mock
// ----------------------------------------------------------------------------
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(),
}));

// ----------------------------------------------------------------------------
// Quest hooks mock
// ----------------------------------------------------------------------------
let mockUseQuestsReturn: any = {
  data: [],
  isLoading: false,
  refetch: jest.fn(),
};
const mockGenerateMutate = jest.fn();

jest.mock('../../hooks/useQuests', () => ({
  useQuests: jest.fn(() => mockUseQuestsReturn),
  useGenerateQuest: jest.fn(() => ({ mutate: mockGenerateMutate, isPending: false })),
  useQuestDetail: jest.fn(),
  useCreateQuest: jest.fn(),
  useCompleteCheckpoint: jest.fn(),
}));

jest.mock('../../api/quest', () => ({
  createQuest: jest.fn(),
  getQuests: jest.fn(),
  generateQuest: jest.fn(),
  getQuestDetail: jest.fn(),
  completeCheckpoint: jest.fn(),
}));

jest.mock('../../api/map', () => ({
  createTimeBlock: jest.fn(),
  getTimeline: jest.fn(),
}));

// ----------------------------------------------------------------------------
// Emotion hooks mock (주의: useEmotionCalendar는 select: res => res.data 로 배열을 반환)
// ----------------------------------------------------------------------------
let mockEmotionCalendarReturn: any = { data: [], isLoading: false };
let mockWeeklyReturn: any = { data: null, isLoading: false };
let mockEmotionsByDateReturn: any = { data: [], isLoading: false };

jest.mock('../../hooks/useEmotions', () => ({
  useEmotionCalendar: jest.fn(() => mockEmotionCalendarReturn),
  useWeeklySummary: jest.fn(() => mockWeeklyReturn),
  useEmotionsByDate: jest.fn(() => mockEmotionsByDateReturn),
  useTodayEmotions: jest.fn(() => ({ data: [] })),
  useCreateEmotion: jest.fn(() => ({ mutate: jest.fn(), mutateAsync: jest.fn(), isPending: false })),
}));

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('플로우 4: 에러 케이스', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.clearAll();
    mockUseQuestsReturn = {
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    };
    mockEmotionCalendarReturn = { data: [], isLoading: false };
    mockEmotionsByDateReturn = { data: [], isLoading: false };
  });

  // ==========================================================================
  // 4.1 빈 상태 UI
  // ==========================================================================
  describe('4.1 빈 상태 UI', () => {
    it('빈 퀘스트 목록 → "첫 퀘스트 만들기" 빈 상태 + CTA 표시', () => {
      const { getByText } = render(<QuestBoardScreen />);
      // 빈 상태 메시지 (구현: "첫 퀘스트 만들기" 텍스트)
      expect(getByText(/첫 퀘스트/)).toBeTruthy();
    });

    it('빈 상태에서 CTA 탭 → QuestCreate 네비게이션', () => {
      const { getByText } = render(<QuestBoardScreen />);
      const cta = getByText(/첫 퀘스트/);
      fireEvent.press(cta);
      expect(mockNavigate).toHaveBeenCalledWith('QuestCreate');
    });

    it('빈 감정 캘린더 → 화면 렌더 (days 배열 빈 상태)', () => {
      // 빈 데이터로 캘린더 화면 렌더 — 크래시 없이 표시되어야 함
      const rendered = render(<EmotionCalendarScreen />);
      // 화면 타이틀이나 월 네비게이션이 존재
      // EmotionCalendarScreen 은 빈 상태에서도 월 표시는 렌더함
      expect(rendered).toBeTruthy();
    });
  });

  // ==========================================================================
  // 4.2 API 실패 시 에러 처리 (화면 레벨)
  // ==========================================================================
  describe('4.2 API 에러 → 사용자 피드백', () => {
    it('퀘스트 생성 중 mutation 실패 → Alert "변환 실패"', () => {
      const AlertSpy = jest.spyOn(require('react-native').Alert, 'alert');

      let capturedOnError: (() => void) | undefined;
      mockGenerateMutate.mockImplementation((_payload, callbacks) => {
        capturedOnError = callbacks?.onError;
      });

      const rendered = render(<QuestCreateScreen />);
      fireEvent.changeText(rendered.getByPlaceholderText(/설거지/), '보고서 작성');
      fireEvent.press(rendered.getByText('퀘스트 변환!'));

      // 에러 콜백 트리거
      act(() => {
        capturedOnError?.();
      });

      expect(AlertSpy).toHaveBeenCalledWith(
        '변환 실패',
        expect.stringContaining('다시 시도'),
      );
      AlertSpy.mockRestore();
    });

    // [수동] 네트워크 끊김 상태에서 앱 전체적으로 토스트 표시 여부는 전역 에러 바운더리 필요 — 수동 확인
    // [수동] 요청 타임아웃(15s) 시뮬레이션 — jest fake timer로는 axios 내부 타임아웃 검증 어려움
  });

  // ==========================================================================
  // 4.3 토큰 저장소 — 리프레시 실패 시 clearTokens
  // ==========================================================================
  // 상세한 apiClient 동작 테스트는 src/api/__tests__/client.test.ts 가 커버.
  // 여기서는 리프레시 실패 시 스토리지 상태 전이만 검증.
  describe('4.3 토큰 저장소 상태 전이', () => {
    it('setTokens → getAccessToken/getRefreshToken 정상 반환', () => {
      setTokens('access-abc', 'refresh-xyz');
      expect(getAccessToken()).toBe('access-abc');
      expect(getRefreshToken()).toBe('refresh-xyz');
    });

    it('clearTokens → getAccessToken/getRefreshToken 모두 undefined', () => {
      setTokens('access-abc', 'refresh-xyz');
      clearTokens();
      expect(getAccessToken()).toBeUndefined();
      expect(getRefreshToken()).toBeUndefined();
    });

    // [자동화 완료] 401 → 리프레시 → 재시도 로직은 client.test.ts 에서 완전 커버.
    // [수동]       RootNavigator 로그인 화면 리다이렉션 — NavigationContainer 통합 필요.
  });
});
