import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckinScreen from '../CheckinScreen';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// API mocks
const mockSubmitCheckin = jest.fn();
const mockGetTodayCheckins = jest.fn();
const mockGetStreaks = jest.fn();
const mockGetMedications = jest.fn();
const mockCreateMedLog = jest.fn();
const mockGetTimeline = jest.fn();

jest.mock('../../../api/gate', () => ({
  submitCheckin: (...args: any[]) => mockSubmitCheckin(...args),
  getTodayCheckins: (...args: any[]) => mockGetTodayCheckins(...args),
  getStreaks: (...args: any[]) => mockGetStreaks(...args),
  getMedications: (...args: any[]) => mockGetMedications(...args),
  createMedLog: (...args: any[]) => mockCreateMedLog(...args),
}));

jest.mock('../../../api/map', () => ({
  getTimeline: (...args: any[]) => mockGetTimeline(...args),
}));

// Store mock — use real store but reset
jest.mock('../../../stores/useGateStore', () => {
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
    addMedication: (medication: any) =>
      set((s: any) => ({ medications: [...s.medications, medication] })),
    removeMedication: (id: number) =>
      set((s: any) => ({ medications: s.medications.filter((m: any) => m.id !== id) })),
    updateMedication: (id: number, updates: any) =>
      set((s: any) => ({
        medications: s.medications.map((m: any) => (m.id === id ? { ...m, ...updates } : m)),
      })),
    setTodayMedLogs: (logs: any) => set({ todayMedLogs: logs }),
    addMedLog: (log: any) =>
      set((s: any) => ({ todayMedLogs: [...s.todayMedLogs, log] })),
    updateMedLog: (id: number, updates: any) =>
      set((s: any) => ({
        todayMedLogs: s.todayMedLogs.map((l: any) => (l.id === id ? { ...l, ...updates } : l)),
      })),
    getCheckinStreak: () => {
      const streak = get().streaks.find((s: any) => s.streakType === 'CHECKIN');
      return streak?.currentCount ?? 0;
    },
  }));
  return { useGateStore: store };
});

// lottie
jest.mock('lottie-react-native', () => 'LottieView');

// expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupInitMocks(opts: {
  todayRecords?: any[];
  yesterdayRecords?: any[];
  streaks?: any[];
  meds?: any[];
} = {}) {
  mockGetTodayCheckins.mockImplementation((date: string) => {
    if (date.includes('2026')) {
      // distinguish today vs yesterday by which call
      return Promise.resolve({ data: opts.todayRecords ?? [] });
    }
    return Promise.resolve({ data: opts.yesterdayRecords ?? [] });
  });
  // More precise: first call = today, second = yesterday
  if (opts.yesterdayRecords) {
    mockGetTodayCheckins
      .mockResolvedValueOnce({ data: opts.todayRecords ?? [] })
      .mockResolvedValueOnce({ data: opts.yesterdayRecords ?? [] });
  } else {
    mockGetTodayCheckins.mockResolvedValue({ data: opts.todayRecords ?? [] });
  }
  mockGetStreaks.mockResolvedValue({ data: opts.streaks ?? [] });
  mockGetMedications.mockResolvedValue({ data: opts.meds ?? [] });
}

const CHECKIN_SUCCESS = {
  data: { id: 1, streakCount: 5, reward: { exp: 10, gold: 10 } },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CheckinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Reset store
    const { useGateStore } = require('../../../stores/useGateStore');
    useGateStore.setState({
      todayMorningCheckin: null,
      todayEveningCheckin: null,
      yesterdayEveningCheckin: null,
      streaks: [],
      medications: [],
      todayMedLogs: [],
    });
  });

  // =========================================================================
  // 1. Morning rendering
  // =========================================================================
  describe('morning rendering (04:00-13:59)', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks();
    });

    it('shows morning header and greeting', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText(/아침 체크인/)).toBeTruthy();
        expect(getByText(/좋은 아침/)).toBeTruthy();
      });
    });

    it('shows sleep hours selector with default 7시간', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText('7시간')).toBeTruthy();
        expect(getByText('어젯밤 수면 시간')).toBeTruthy();
      });
    });

    it('shows sleep quality options (나쁨/보통/좋음)', async () => {
      const { getAllByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        // "나쁨" and "좋음" may appear in both sleep quality and condition rows
        expect(getAllByText('나쁨').length).toBeGreaterThanOrEqual(1);
        expect(getAllByText('좋음').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows condition selector', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText('지금 컨디션은?')).toBeTruthy();
        expect(getByText('최악')).toBeTruthy();
        expect(getByText('최고')).toBeTruthy();
      });
    });

    it('increments sleep hours with +0.5 button', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('7시간')).toBeTruthy());
      fireEvent.press(getByText('+0.5'));
      expect(getByText('7.5시간')).toBeTruthy();
    });

    it('decrements sleep hours with -0.5 button', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('7시간')).toBeTruthy());
      fireEvent.press(getByText('-0.5'));
      expect(getByText('6.5시간')).toBeTruthy();
    });

    it('clamps sleep hours at min 4 / max 10', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('7시간')).toBeTruthy());

      for (let i = 0; i < 20; i++) fireEvent.press(getByText('-0.5'));
      expect(getByText('4시간')).toBeTruthy();

      for (let i = 0; i < 30; i++) fireEvent.press(getByText('+0.5'));
      expect(getByText('10시간')).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. Evening rendering
  // =========================================================================
  describe('evening rendering (14:00-03:59)', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      setupInitMocks();
    });

    it('shows evening header and greeting', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText(/저녁 체크인/)).toBeTruthy();
        expect(getByText(/오늘 하루 수고했어요/)).toBeTruthy();
      });
    });

    it('shows focus/impulsivity/emotion questions', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText('오늘 집중력은 어땠나요?')).toBeTruthy();
        expect(getByText('오늘 충동성/산만함은?')).toBeTruthy();
        expect(getByText('오늘 감정은 어땠나요?')).toBeTruthy();
      });
    });

    it('shows memo toggle (collapsed by default)', async () => {
      const { getByText, queryByPlaceholderText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText('+ 메모 추가')).toBeTruthy();
      });
      expect(queryByPlaceholderText('오늘 특별한 일이 있었나요?')).toBeNull();
    });

    it('expands memo on tap', async () => {
      const { getByText, getByPlaceholderText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('+ 메모 추가')).toBeTruthy());
      fireEvent.press(getByText('+ 메모 추가'));
      expect(getByPlaceholderText('오늘 특별한 일이 있었나요?')).toBeTruthy();
    });
  });

  // =========================================================================
  // 3. Validation — submit disabled
  // =========================================================================
  describe('morning validation', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks();
    });

    it('does not call API when no fields selected', async () => {
      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('체크인 완료!')).toBeTruthy());
      fireEvent.press(getByText('체크인 완료!'));
      expect(mockSubmitCheckin).not.toHaveBeenCalled();
    });

    it('does not call API with only sleep quality selected', async () => {
      const { getAllByText, getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getAllByText('좋음').length).toBeGreaterThanOrEqual(1));
      fireEvent.press(getAllByText('좋음')[0]); // sleep quality only
      fireEvent.press(getByText('체크인 완료!'));
      expect(mockSubmitCheckin).not.toHaveBeenCalled();
    });
  });

  describe('evening validation', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      setupInitMocks();
    });

    it('does not call API with only one evening field', async () => {
      const { getByText, getAllByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('오늘 집중력은 어땠나요?')).toBeTruthy());
      const goodBtns = getAllByText('좋음');
      fireEvent.press(goodBtns[0]); // only focus
      fireEvent.press(getByText('체크인 완료!'));
      expect(mockSubmitCheckin).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 4. Successful morning submit
  // =========================================================================
  describe('morning submit flow', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks();
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('calls submitCheckin with correct morning payload', async () => {
      mockSubmitCheckin.mockResolvedValueOnce(CHECKIN_SUCCESS);
      const { getByText, getAllByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getAllByText('좋음').length).toBeGreaterThanOrEqual(1));

      // Select sleep quality = 좋음(3), condition = 최고(5)
      fireEvent.press(getAllByText('좋음')[0]);
      fireEvent.press(getByText('최고'));

      await act(async () => {
        fireEvent.press(getByText('체크인 완료!'));
      });

      expect(mockSubmitCheckin).toHaveBeenCalledWith(
        expect.objectContaining({
          checkinType: 'MORNING',
          sleepQuality: 3,
          condition: 5,
          sleepHours: 7,
        }),
      );
    });

    it('shows completion screen with streak count and rewards', async () => {
      mockSubmitCheckin.mockResolvedValueOnce(CHECKIN_SUCCESS);
      const { getByText, getAllByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getAllByText('좋음').length).toBeGreaterThanOrEqual(1));

      fireEvent.press(getAllByText('좋음')[0]);
      fireEvent.press(getByText('최고'));

      await act(async () => {
        fireEvent.press(getByText('체크인 완료!'));
      });

      await waitFor(() => {
        expect(getByText('체크인 완료!')).toBeTruthy();
        expect(getByText(/5일째/)).toBeTruthy();
        // +10 appears twice (EXP and Gold both 10)
        expect(getAllByText('+10').length).toBe(2);
        expect(getByText('EXP')).toBeTruthy();
        expect(getByText('Gold')).toBeTruthy();
      });
    });

    it('"홈으로" button calls goBack', async () => {
      mockSubmitCheckin.mockResolvedValueOnce(CHECKIN_SUCCESS);
      const { getByText, getAllByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getAllByText('좋음').length).toBeGreaterThanOrEqual(1));

      fireEvent.press(getAllByText('좋음')[0]);
      fireEvent.press(getByText('최고'));

      await act(async () => {
        fireEvent.press(getByText('체크인 완료!'));
      });

      await waitFor(() => expect(getByText('홈으로')).toBeTruthy());
      fireEvent.press(getByText('홈으로'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 5. Successful evening submit
  // =========================================================================
  describe('evening submit flow', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      setupInitMocks();
    });

    it('calls submitCheckin with correct evening payload', async () => {
      mockSubmitCheckin.mockResolvedValueOnce(CHECKIN_SUCCESS);
      const { getByText, getAllByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('오늘 집중력은 어땠나요?')).toBeTruthy());

      // Select 보통(3) for all three
      const normalBtns = getAllByText('보통');
      fireEvent.press(normalBtns[0]);
      fireEvent.press(normalBtns[1]);
      fireEvent.press(normalBtns[2]);

      await act(async () => {
        fireEvent.press(getByText('체크인 완료!'));
      });

      expect(mockSubmitCheckin).toHaveBeenCalledWith(
        expect.objectContaining({
          checkinType: 'EVENING',
          focusScore: 3,
          impulsivityScore: 3,
          emotionScore: 3,
        }),
      );
    });
  });

  // =========================================================================
  // 6. Already-done state
  // =========================================================================
  describe('duplicate checkin', () => {
    it('shows "이미 했어요" when morning already done', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks({
        todayRecords: [{ id: 1, checkinType: 'MORNING', checkinDate: '2026-04-09' }],
      });

      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(getByText(/이미 했어요/)).toBeTruthy();
      });
    });

    it('shows "이미 했어요" when evening already done', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
      setupInitMocks({
        todayRecords: [{ id: 2, checkinType: 'EVENING', checkinDate: '2026-04-09' }],
      });

      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(getByText(/이미 했어요/)).toBeTruthy();
      });
    });

    it('pressing "돌아가기" calls goBack', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks({
        todayRecords: [{ id: 1, checkinType: 'MORNING', checkinDate: '2026-04-09' }],
      });

      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('돌아가기')).toBeTruthy());
      fireEvent.press(getByText('돌아가기'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 7. Missed evening banner
  // =========================================================================
  describe('missed evening banner', () => {
    it('shows missed evening banner when yesterday evening not recorded', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks({
        todayRecords: [],
        yesterdayRecords: [], // no evening yesterday
      });

      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(getByText(/어제 저녁 기록도 같이 할까요/)).toBeTruthy();
      });
    });

    it('tapping banner switches to evening form', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks({
        todayRecords: [],
        yesterdayRecords: [],
      });

      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText(/어제 저녁 기록도/)).toBeTruthy());

      fireEvent.press(getByText(/어제 저녁 기록도/));

      // Should now show evening form
      await waitFor(() => {
        expect(getByText('오늘 집중력은 어땠나요?')).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // 8. Medication section in morning
  // =========================================================================
  describe('medication section (morning)', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });

    it('shows medication checkbox when meds are registered', async () => {
      setupInitMocks({
        meds: [{ id: 10, medName: '콘서타', dosage: '27mg', scheduleTime: '08:00', isActive: true }],
      });

      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(getByText('오늘 약 드셨나요?')).toBeTruthy();
        expect(getByText('콘서타 27mg')).toBeTruthy();
      });
    });

    it('hides medication section when no meds registered', async () => {
      setupInitMocks({ meds: [] });
      const { queryByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => {
        expect(queryByText('오늘 약 드셨나요?')).toBeNull();
      });
    });

    it('logs medication on submit when checked', async () => {
      setupInitMocks({
        meds: [{ id: 10, medName: '콘서타', dosage: '27mg', scheduleTime: '08:00', isActive: true }],
      });
      mockSubmitCheckin.mockResolvedValueOnce(CHECKIN_SUCCESS);
      mockCreateMedLog.mockResolvedValueOnce({ data: { id: 100 } });

      const { getByText, getAllByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('콘서타 27mg')).toBeTruthy());

      // Check medication
      fireEvent.press(getByText('콘서타 27mg'));

      // Fill required fields
      const goodBtns = getAllByText('좋음');
      fireEvent.press(goodBtns[0]);
      fireEvent.press(getByText('최고'));

      await act(async () => {
        fireEvent.press(getByText('체크인 완료!'));
      });

      expect(mockCreateMedLog).toHaveBeenCalledWith({ medicationId: 10 });
    });
  });

  // =========================================================================
  // 9. Streak bonus banner
  // =========================================================================
  describe('streak bonus', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks();
      jest.useFakeTimers();
    });
    afterEach(() => jest.useRealTimers());

    it('shows streak bonus banner on 7-day streak', async () => {
      mockSubmitCheckin.mockResolvedValueOnce({
        data: { id: 1, streakCount: 7, reward: { exp: 10, gold: 10 } },
      });

      const { getByText, getAllByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getAllByText('좋음').length).toBeGreaterThanOrEqual(1));

      fireEvent.press(getAllByText('좋음')[0]);
      fireEvent.press(getByText('최고'));

      await act(async () => {
        fireEvent.press(getByText('체크인 완료!'));
      });

      await waitFor(() => {
        expect(getByText(/7일 연속 달성/)).toBeTruthy();
        expect(getByText(/\+50 EXP/)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // 10. Loading state
  // =========================================================================
  describe('loading state', () => {
    it('shows loading indicator during initial fetch', () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      mockGetTodayCheckins.mockReturnValue(new Promise(() => {}));
      mockGetStreaks.mockReturnValue(new Promise(() => {}));
      mockGetMedications.mockReturnValue(new Promise(() => {}));

      const { toJSON } = render(<CheckinScreen />, { wrapper: createWrapper() });
      // Should render without crashing (loading state)
      expect(toJSON()).toBeTruthy();
    });
  });

  // =========================================================================
  // 11. Network error handling
  // =========================================================================
  describe('network error', () => {
    it('shows form even when init fetch fails', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      mockGetTodayCheckins.mockRejectedValue(new Error('Network Error'));
      mockGetStreaks.mockRejectedValue(new Error('Network Error'));
      mockGetMedications.mockRejectedValue(new Error('Network Error'));

      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(getByText(/좋은 아침/)).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // 12. Back navigation
  // =========================================================================
  describe('navigation', () => {
    it('back button calls goBack', async () => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      setupInitMocks();

      const { getByText } = render(<CheckinScreen />, { wrapper: createWrapper() });
      await waitFor(() => expect(getByText('<')).toBeTruthy());
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
