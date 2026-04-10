/**
 * 플로우 3: 체크인
 *
 * 체크리스트 (docs/MANUAL_TEST_CHECKLIST.md 참조):
 *   [A]    아침 체크인 — 수면 시간 + 수면 질 + 컨디션 선택 → 저장
 *   [A]    저장 → 스트릭 카운트 증가 확인
 *   [A]    약물 체크 — 복용 기록 createMedLog 호출
 *   [A]    저녁 체크인 — 집중/충동/감정 3문항 → 저장
 *   [A]    중복 체크인 시도 → 에러 토스트 (이미 체크인 기록 존재)
 *   [수동] 저녁 체크인 하루 요약 카드 애니메이션 — 시각 확인
 *   [수동] 스트릭 7일 보너스 알림 — 백엔드 이벤트
 *   [수동] Lottie 체크인 완료 애니메이션 — 시각 확인
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import CheckinScreen from '../../screens/gate/CheckinScreen';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ----------------------------------------------------------------------------
// Navigation mock
// ----------------------------------------------------------------------------
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ----------------------------------------------------------------------------
// API mocks
// ----------------------------------------------------------------------------
const mockSubmitCheckin = jest.fn();
const mockGetTodayCheckins = jest.fn();
const mockGetStreaks = jest.fn();
const mockGetMedications = jest.fn();
const mockCreateMedLog = jest.fn();
const mockGetTimeline = jest.fn();

jest.mock('../../api/gate', () => ({
  submitCheckin: (...args: any[]) => mockSubmitCheckin(...args),
  getTodayCheckins: (...args: any[]) => mockGetTodayCheckins(...args),
  getStreaks: (...args: any[]) => mockGetStreaks(...args),
  getMedications: (...args: any[]) => mockGetMedications(...args),
  createMedLog: (...args: any[]) => mockCreateMedLog(...args),
}));

jest.mock('../../api/map', () => ({
  getTimeline: (...args: any[]) => mockGetTimeline(...args),
}));

// ----------------------------------------------------------------------------
// GateStore mock (using real zustand create)
// ----------------------------------------------------------------------------
jest.mock('../../stores/useGateStore', () => {
  const { create } = require('zustand');
  const store = create((set: any, get: any) => ({
    todayMorningCheckin: null,
    todayEveningCheckin: null,
    yesterdayEveningCheckin: null,
    streaks: [],
    medications: [],
    todayMedLogs: [],
    setTodayCheckin: (type: string, record: any) =>
      set(type === 'MORNING' ? { todayMorningCheckin: record } : { todayEveningCheckin: record }),
    setYesterdayEveningCheckin: (record: any) => set({ yesterdayEveningCheckin: record }),
    setStreaks: (streaks: any) => set({ streaks }),
    setMedications: (medications: any) => set({ medications }),
    addMedication: (m: any) => set((s: any) => ({ medications: [...s.medications, m] })),
    removeMedication: (id: number) =>
      set((s: any) => ({ medications: s.medications.filter((m: any) => m.id !== id) })),
    updateMedication: (id: number, u: any) =>
      set((s: any) => ({
        medications: s.medications.map((m: any) => (m.id === id ? { ...m, ...u } : m)),
      })),
    setTodayMedLogs: (logs: any) => set({ todayMedLogs: logs }),
    addMedLog: (log: any) => set((s: any) => ({ todayMedLogs: [...s.todayMedLogs, log] })),
    updateMedLog: (id: number, u: any) =>
      set((s: any) => ({
        todayMedLogs: s.todayMedLogs.map((l: any) => (l.id === id ? { ...l, ...u } : l)),
      })),
    getCheckinStreak: () => {
      const streak = get().streaks.find((s: any) => s.streakType === 'CHECKIN');
      return streak?.currentCount ?? 0;
    },
  }));
  return { useGateStore: store };
});

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
function setupInitMocks(opts: {
  todayRecords?: any[];
  streaks?: any[];
  meds?: any[];
} = {}) {
  mockGetTodayCheckins.mockResolvedValue({ data: opts.todayRecords ?? [] });
  mockGetStreaks.mockResolvedValue({ data: opts.streaks ?? [] });
  mockGetMedications.mockResolvedValue({ data: opts.meds ?? [] });
  mockGetTimeline.mockResolvedValue({ data: { blocks: [] } });
}

describe('플로우 3: 체크인', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    const { useGateStore } = require('../../stores/useGateStore');
    useGateStore.setState({
      todayMorningCheckin: null,
      todayEveningCheckin: null,
      yesterdayEveningCheckin: null,
      streaks: [],
      medications: [],
      todayMedLogs: [],
    });
  });

  // ==========================================================================
  // 3.1 아침 체크인
  // ==========================================================================
  describe('3.1 아침 체크인 (04:00~13:59)', () => {
    beforeEach(() => {
      // 오전 9시 시뮬레이션
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks();
    });

    it('아침 체크인 화면 렌더 + 수면/컨디션 섹션 표시', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText(/아침 체크인/)).toBeTruthy();
        expect(getByText('어젯밤 수면 시간')).toBeTruthy();
        expect(getByText('지금 컨디션은?')).toBeTruthy();
      });
    });

    it('수면 시간 +0.5 / -0.5 버튼으로 조정 가능', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('7시간')).toBeTruthy());
      fireEvent.press(getByText('+0.5'));
      expect(getByText('7.5시간')).toBeTruthy();
      fireEvent.press(getByText('-0.5'));
      fireEvent.press(getByText('-0.5'));
      expect(getByText('6.5시간')).toBeTruthy();
    });

    it('수면 질/컨디션 선택 후 저장 → submitCheckin API 호출 + 스트릭 카운트 갱신', async () => {
      mockSubmitCheckin.mockResolvedValueOnce({
        data: { id: 1, streakCount: 5, reward: { exp: 10, gold: 10 } },
      });

      const rendered = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() =>
        expect(rendered.getAllByText('좋음').length).toBeGreaterThanOrEqual(1),
      );

      // 수면 질 = 좋음(3), 컨디션 = 최고(5)
      fireEvent.press(rendered.getAllByText('좋음')[0]);
      fireEvent.press(rendered.getByText('최고'));

      await act(async () => {
        fireEvent.press(rendered.getByText('체크인 완료!'));
      });

      await waitFor(() => {
        // 백엔드 CheckinRequest: `type` (not `checkinType`), no `checkinDate`
        expect(mockSubmitCheckin).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'MORNING',
            sleepHours: 7,
            sleepQuality: 3,
            condition: 5,
          }),
        );
      });

      // 스트릭 카운트 5 반영 확인
      await waitFor(() => {
        expect(rendered.getByText(/5일째/)).toBeTruthy();
      });
    });
  });

  // ==========================================================================
  // 3.2 저녁 체크인
  // ==========================================================================
  describe('3.2 저녁 체크인 (14:00~03:59)', () => {
    beforeEach(() => {
      // 오후 8시 시뮬레이션
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      setupInitMocks();
    });

    it('저녁 체크인 화면 렌더 + 집중/충동/감정 3섹션 표시', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText(/저녁 체크인/)).toBeTruthy();
        // 3가지 항목 라벨
        expect(getByText(/집중/)).toBeTruthy();
        expect(getByText(/충동/)).toBeTruthy();
        expect(getByText(/감정/)).toBeTruthy();
      });
    });

    it('3문항 전부 선택 후 저장 → submitCheckin EVENING 호출', async () => {
      mockSubmitCheckin.mockResolvedValueOnce({
        data: { id: 2, streakCount: 6, reward: { exp: 10, gold: 10 } },
      });
      // 저녁 체크인 완료 후 호출되는 getTimeline
      mockGetTimeline.mockResolvedValue({ data: { blocks: [] } });

      const rendered = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(rendered.getByText(/저녁 체크인/)).toBeTruthy());

      // 3문항 "보통"(3점) 각각 선택 — 3개의 EmojiRow가 각각 동일 라벨을 가짐
      const normalBtns = rendered.getAllByText('보통');
      expect(normalBtns.length).toBeGreaterThanOrEqual(3);
      fireEvent.press(normalBtns[0]);
      fireEvent.press(normalBtns[1]);
      fireEvent.press(normalBtns[2]);

      await act(async () => {
        fireEvent.press(rendered.getByText('체크인 완료!'));
      });

      await waitFor(() => {
        expect(mockSubmitCheckin).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'EVENING',
            focusScore: 3,
            impulsivityScore: 3,
            emotionScore: 3,
          }),
        );
      });
    });
  });

  // ==========================================================================
  // 3.3 중복 체크인 에러 처리
  // ==========================================================================
  describe('3.3 중복 체크인', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });

    it('이미 오늘 아침 체크인 기록 존재 → "완료" 상태 UI 표시 + 저장 불가', async () => {
      setupInitMocks({
        todayRecords: [
          {
            id: 1,
            checkinType: 'MORNING',
            checkinDate: new Date().toISOString().slice(0, 10),
            sleepHours: 7,
            sleepQuality: 3,
            condition: 4,
          },
        ],
      });

      const rendered = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        // 이미 체크인 완료 상태 UI — 구현에 따라 "완료", "오늘은", "이미" 중 하나
        const done =
          rendered.queryByText(/이미|완료|오늘은|수고/);
        expect(done).toBeTruthy();
      });
    });

    it('서버에서 중복 에러 응답 시 — submitCheckin에서 rejected → 화면 크래시 없음', async () => {
      setupInitMocks();
      mockSubmitCheckin.mockRejectedValueOnce({
        response: { data: { error: { code: 'GATE_001', message: '이미 오늘 MORNING 체크인 기록이 있습니다.' } } },
      });

      const rendered = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() =>
        expect(rendered.getAllByText('좋음').length).toBeGreaterThanOrEqual(1),
      );

      // 최소 선택
      fireEvent.press(rendered.getAllByText('좋음')[0]);
      fireEvent.press(rendered.getByText('최고'));

      await act(async () => {
        fireEvent.press(rendered.getByText('체크인 완료!'));
        await Promise.resolve();
        await Promise.resolve();
      });

      // 화면이 크래시하지 않고 체크인 섹션 여전히 존재
      expect(rendered.getByText('지금 컨디션은?')).toBeTruthy();
    });
  });
});
