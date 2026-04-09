import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MedicationScreen from '../MedicationScreen';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

// API mocks
const mockGetMedications = jest.fn();
const mockCreateMedication = jest.fn();
const mockCreateMedLog = jest.fn();
const mockApiUpdateMedLog = jest.fn();
const mockApiUpdateMed = jest.fn();
const mockApiDeleteMed = jest.fn();

jest.mock('../../../api/gate', () => ({
  getMedications: (...args: any[]) => mockGetMedications(...args),
  createMedication: (...args: any[]) => mockCreateMedication(...args),
  createMedLog: (...args: any[]) => mockCreateMedLog(...args),
  updateMedLog: (...args: any[]) => mockApiUpdateMedLog(...args),
  updateMedication: (...args: any[]) => mockApiUpdateMed(...args),
  deleteMedication: (...args: any[]) => mockApiDeleteMed(...args),
}));

// expo-notifications
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-id'),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

// Store mock — real zustand store
jest.mock('../../../stores/useGateStore', () => {
  const { create } = require('zustand');
  const store = create((set: any, get: any) => ({
    todayMorningCheckin: null,
    todayEveningCheckin: null,
    yesterdayEveningCheckin: null,
    streaks: [],
    medications: [] as any[],
    todayMedLogs: [] as any[],
    setTodayCheckin: jest.fn(),
    setYesterdayEveningCheckin: jest.fn(),
    setStreaks: jest.fn(),
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
    getCheckinStreak: () => 0,
  }));
  return { useGateStore: store };
});

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const MOCK_MEDS = [
  {
    id: 1,
    medName: '콘서타 (메틸페니데이트 OROS)',
    dosage: '27mg',
    scheduleTime: '08:00',
    isActive: true,
    createdAt: '2026-01-01T00:00:00',
  },
  {
    id: 2,
    medName: '스트라테라 (아토목세틴)',
    dosage: '40mg',
    scheduleTime: '09:00',
    isActive: true,
    createdAt: '2026-01-02T00:00:00',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MedicationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store
    const { useGateStore } = require('../../../stores/useGateStore');
    useGateStore.setState({ medications: [], todayMedLogs: [] });
  });

  // =========================================================================
  // 1. Header rendering
  // =========================================================================
  it('renders header with title', () => {
    mockGetMedications.mockReturnValue(new Promise(() => {}));
    const { getByText } = render(<MedicationScreen />);
    expect(getByText(/약물 관리/)).toBeTruthy();
  });

  // =========================================================================
  // 2. Loading state
  // =========================================================================
  it('shows loading state while fetching', () => {
    mockGetMedications.mockReturnValue(new Promise(() => {}));
    const { toJSON } = render(<MedicationScreen />);
    expect(toJSON()).toBeTruthy();
  });

  // =========================================================================
  // 3. Empty state
  // =========================================================================
  it('shows empty state when no medications', async () => {
    mockGetMedications.mockResolvedValueOnce({ data: [] });
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('등록된 약물이 없어요')).toBeTruthy();
      expect(getByText('약물 등록하기')).toBeTruthy();
    });
  });

  it('empty state "약물 등록하기" opens add modal', async () => {
    mockGetMedications.mockResolvedValueOnce({ data: [] });
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => expect(getByText('약물 등록하기')).toBeTruthy());
    fireEvent.press(getByText('약물 등록하기'));
    expect(getByText('약물 추가')).toBeTruthy();
  });

  // =========================================================================
  // 4. Medication list rendering
  // =========================================================================
  it('renders medication cards with name, dosage, and time', async () => {
    mockGetMedications.mockResolvedValueOnce({ data: MOCK_MEDS });
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('콘서타 (메틸페니데이트 OROS)')).toBeTruthy();
      expect(getByText('27mg · 08:00')).toBeTruthy();
      expect(getByText('스트라테라 (아토목세틴)')).toBeTruthy();
      expect(getByText('40mg · 09:00')).toBeTruthy();
    });
  });

  it('shows pill emoji for each card', async () => {
    mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
    const { getAllByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getAllByText('💊').length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 5. Take medication (circle checkbox)
  // =========================================================================
  describe('take medication', () => {
    it('calls createMedLog when take button pressed', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      mockCreateMedLog.mockResolvedValueOnce({
        data: { id: 100, medicationId: 1, logDate: '2026-04-09', takenAt: '2026-04-09T08:00:00' },
      });

      const { getByLabelText } = render(<MedicationScreen />);

      await waitFor(() => {
        expect(getByLabelText(/콘서타.*복용 기록/)).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByLabelText(/콘서타.*복용 기록/));
      });

      expect(mockCreateMedLog).toHaveBeenCalledWith({ medicationId: 1 });
    });

    it('shows checkmark after successful take', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      mockCreateMedLog.mockResolvedValueOnce({
        data: { id: 100, medicationId: 1, logDate: '2026-04-09', takenAt: '2026-04-09T08:00:00' },
      });

      const { getByLabelText, getByText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByLabelText(/콘서타.*복용 기록/)).toBeTruthy());

      await act(async () => {
        fireEvent.press(getByLabelText(/콘서타.*복용 기록/));
      });

      await waitFor(() => {
        expect(getByText('✓')).toBeTruthy();
      });
    });

    it('shows alert on take failure', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      mockCreateMedLog.mockRejectedValueOnce(new Error('Network'));
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByLabelText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByLabelText(/콘서타.*복용 기록/)).toBeTruthy());

      await act(async () => {
        fireEvent.press(getByLabelText(/콘서타.*복용 기록/));
      });

      expect(alertSpy).toHaveBeenCalledWith('기록 실패', '잠시 후 다시 시도해주세요.');
      alertSpy.mockRestore();
    });
  });

  // =========================================================================
  // 6. Effectiveness expansion
  // =========================================================================
  describe('effectiveness UI', () => {
    it('shows effectiveness UI after tapping taken med card', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      mockCreateMedLog.mockResolvedValueOnce({
        data: { id: 100, medicationId: 1, logDate: '2026-04-09', takenAt: '2026-04-09T08:00:00' },
      });

      const { getByLabelText, getByText } = render(<MedicationScreen />);
      const takeLabel = '콘서타 (메틸페니데이트 OROS) 복용 기록';
      const cardLabel = '콘서타 (메틸페니데이트 OROS) 27mg';
      await waitFor(() => expect(getByLabelText(takeLabel)).toBeTruthy());

      // Take medication first
      await act(async () => {
        fireEvent.press(getByLabelText(takeLabel));
      });

      // Then tap the card to expand
      await act(async () => {
        fireEvent.press(getByLabelText(cardLabel));
      });

      await waitFor(() => {
        expect(getByText('약이 효과가 있나요?')).toBeTruthy();
        expect(getByText('없음')).toBeTruthy();
        expect(getByText('약간')).toBeTruthy();
        expect(getByText('확실히')).toBeTruthy();
      });
    });

    it('shows side effect chips in expanded view', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      mockCreateMedLog.mockResolvedValueOnce({
        data: { id: 100, medicationId: 1, logDate: '2026-04-09', takenAt: '2026-04-09T08:00:00' },
      });

      const { getByLabelText, getByText } = render(<MedicationScreen />);
      const takeLabel = '콘서타 (메틸페니데이트 OROS) 복용 기록';
      const cardLabel = '콘서타 (메틸페니데이트 OROS) 27mg';
      await waitFor(() => expect(getByLabelText(takeLabel)).toBeTruthy());

      await act(async () => {
        fireEvent.press(getByLabelText(takeLabel));
      });
      await act(async () => {
        fireEvent.press(getByLabelText(cardLabel));
      });

      await waitFor(() => {
        expect(getByText('부작용 (복수 선택)')).toBeTruthy();
        expect(getByText('식욕 감소')).toBeTruthy();
        expect(getByText('두통')).toBeTruthy();
        expect(getByText('불면')).toBeTruthy();
        expect(getByText('심박수 증가')).toBeTruthy();
        expect(getByText('기분 저하')).toBeTruthy();
      });
    });

    it('submits effectiveness with updateMedLog API', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      mockCreateMedLog.mockResolvedValueOnce({
        data: { id: 100, medicationId: 1, logDate: '2026-04-09', takenAt: '2026-04-09T08:00:00' },
      });
      mockApiUpdateMedLog.mockResolvedValueOnce({ data: { id: 100, effectiveness: 3 } });

      const { getByLabelText, getByText } = render(<MedicationScreen />);
      const takeLabel = '콘서타 (메틸페니데이트 OROS) 복용 기록';
      const cardLabel = '콘서타 (메틸페니데이트 OROS) 27mg';
      await waitFor(() => expect(getByLabelText(takeLabel)).toBeTruthy());

      // Take → expand → select effectiveness → submit
      await act(async () => {
        fireEvent.press(getByLabelText(takeLabel));
      });
      await act(async () => {
        fireEvent.press(getByLabelText(cardLabel));
      });

      await waitFor(() => expect(getByText('확실히')).toBeTruthy());
      fireEvent.press(getByText('확실히'));

      // Select a side effect
      fireEvent.press(getByText('두통'));

      await act(async () => {
        fireEvent.press(getByText('기록하기'));
      });

      expect(mockApiUpdateMedLog).toHaveBeenCalledWith(100, {
        effectiveness: 3,
        sideEffects: ['두통'],
      });
    });
  });

  // =========================================================================
  // 7. Add medication modal
  // =========================================================================
  describe('add medication modal', () => {
    beforeEach(() => {
      mockGetMedications.mockResolvedValueOnce({ data: [] });
    });

    it('FAB opens add modal', async () => {
      const { getByText, getByLabelText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());

      fireEvent.press(getByLabelText('약물 추가'));
      expect(getByText('약물 추가')).toBeTruthy();
      expect(getByText('약물 선택')).toBeTruthy();
    });

    it('shows all ADHD preset medications', async () => {
      const { getByText, getByLabelText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());
      fireEvent.press(getByLabelText('약물 추가'));

      expect(getByText('콘서타 (메틸페니데이트 OROS)')).toBeTruthy();
      expect(getByText('메디키넷 (메틸페니데이트 IR)')).toBeTruthy();
      expect(getByText('메디키넷 리타드 (메틸페니데이트 ER)')).toBeTruthy();
      expect(getByText('스트라테라 (아토목세틴)')).toBeTruthy();
      expect(getByText('인튜니브 (구안파신 ER)')).toBeTruthy();
      expect(getByText('직접 입력')).toBeTruthy();
    });

    it('shows dosage chips after selecting a preset', async () => {
      const { getByText, getByLabelText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());
      fireEvent.press(getByLabelText('약물 추가'));

      fireEvent.press(getByText('콘서타 (메틸페니데이트 OROS)'));
      expect(getByText('용량')).toBeTruthy();
      expect(getByText('18mg')).toBeTruthy();
      expect(getByText('27mg')).toBeTruthy();
      expect(getByText('36mg')).toBeTruthy();
      expect(getByText('54mg')).toBeTruthy();
    });

    it('shows time presets', async () => {
      const { getByText, getByLabelText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());
      fireEvent.press(getByLabelText('약물 추가'));

      expect(getByText('복용 시간')).toBeTruthy();
      expect(getByText('07:00')).toBeTruthy();
      expect(getByText('08:00')).toBeTruthy();
      expect(getByText('21:00')).toBeTruthy();
    });

    it('shows custom input fields when "직접 입력" selected', async () => {
      const { getByText, getByLabelText, getByPlaceholderText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());
      fireEvent.press(getByLabelText('약물 추가'));
      fireEvent.press(getByText('직접 입력'));

      expect(getByPlaceholderText('약물명 입력')).toBeTruthy();
      expect(getByPlaceholderText('용량 입력 (예: 27mg)')).toBeTruthy();
    });

    it('creates medication via API on submit', async () => {
      const newMed = {
        id: 3,
        medName: '콘서타 (메틸페니데이트 OROS)',
        dosage: '27mg',
        scheduleTime: '08:00',
        isActive: true,
        createdAt: '2026-01-01T00:00:00',
      };
      mockCreateMedication.mockResolvedValueOnce({ data: newMed });

      const { getByText, getByLabelText, queryByText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());

      fireEvent.press(getByLabelText('약물 추가'));
      fireEvent.press(getByText('콘서타 (메틸페니데이트 OROS)'));
      fireEvent.press(getByText('27mg'));

      await act(async () => {
        fireEvent.press(getByText('등록'));
      });

      expect(mockCreateMedication).toHaveBeenCalledWith({
        medName: '콘서타 (메틸페니데이트 OROS)',
        dosage: '27mg',
        scheduleTime: '08:00',
      });

      // Modal should close
      await waitFor(() => {
        expect(queryByText('약물 추가')).toBeNull();
      });
    });

    it('schedules notification after medication creation', async () => {
      const Notifications = require('expo-notifications');
      mockCreateMedication.mockResolvedValueOnce({
        data: { id: 3, medName: '콘서타', dosage: '27mg', scheduleTime: '08:00', isActive: true },
      });

      const { getByText, getByLabelText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());

      fireEvent.press(getByLabelText('약물 추가'));
      fireEvent.press(getByText('콘서타 (메틸페니데이트 OROS)'));
      fireEvent.press(getByText('27mg'));

      await act(async () => {
        fireEvent.press(getByText('등록'));
      });

      // Should have scheduled 2 notifications (daily + effectiveness check)
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(2);
    });

    it('shows error alert on create failure', async () => {
      mockCreateMedication.mockRejectedValueOnce(new Error('Server Error'));
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByText, getByLabelText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());

      fireEvent.press(getByLabelText('약물 추가'));
      fireEvent.press(getByText('콘서타 (메틸페니데이트 OROS)'));
      fireEvent.press(getByText('27mg'));

      await act(async () => {
        fireEvent.press(getByText('등록'));
      });

      expect(alertSpy).toHaveBeenCalledWith('등록 실패', '약물 등록 중 오류가 발생했습니다.');
      alertSpy.mockRestore();
    });

    it('does not call API when no dosage selected', async () => {
      const { getByText, getByLabelText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByText('등록된 약물이 없어요')).toBeTruthy());

      fireEvent.press(getByLabelText('약물 추가'));
      fireEvent.press(getByText('콘서타 (메틸페니데이트 OROS)'));
      // Don't select dosage

      await act(async () => {
        fireEvent.press(getByText('등록'));
      });

      expect(mockCreateMedication).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 8. Long-press action sheet
  // =========================================================================
  describe('long-press actions', () => {
    it('shows action sheet on long press', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      const { getByLabelText, getByText } = render(<MedicationScreen />);

      await waitFor(() => expect(getByLabelText('콘서타 (메틸페니데이트 OROS) 27mg')).toBeTruthy());

      await act(async () => {
        fireEvent(getByLabelText('콘서타 (메틸페니데이트 OROS) 27mg'), 'longPress');
      });

      expect(getByText('복용 중단')).toBeTruthy();
      expect(getByText('삭제')).toBeTruthy();
      expect(getByText('취소')).toBeTruthy();
    });

    it('deactivate calls updateMedication API', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      mockApiUpdateMed.mockResolvedValueOnce({ data: { id: 1, isActive: false } });

      const { getByLabelText, getByText } = render(<MedicationScreen />);
      await waitFor(() => expect(getByLabelText('콘서타 (메틸페니데이트 OROS) 27mg')).toBeTruthy());

      await act(async () => {
        fireEvent(getByLabelText('콘서타 (메틸페니데이트 OROS) 27mg'), 'longPress');
      });

      await act(async () => {
        fireEvent.press(getByText('복용 중단'));
      });

      expect(mockApiUpdateMed).toHaveBeenCalledWith(1, { isActive: false });
    });

    it('cancel closes action sheet', async () => {
      mockGetMedications.mockResolvedValueOnce({ data: [MOCK_MEDS[0]] });
      const { getByLabelText, getByText, queryByText } = render(<MedicationScreen />);

      await waitFor(() => expect(getByLabelText('콘서타 (메틸페니데이트 OROS) 27mg')).toBeTruthy());

      await act(async () => {
        fireEvent(getByLabelText('콘서타 (메틸페니데이트 OROS) 27mg'), 'longPress');
      });

      expect(getByText('복용 중단')).toBeTruthy();

      fireEvent.press(getByText('취소'));

      await waitFor(() => {
        expect(queryByText('복용 중단')).toBeNull();
      });
    });
  });

  // =========================================================================
  // 9. Network error on initial fetch
  // =========================================================================
  it('shows empty state gracefully when fetch fails', async () => {
    mockGetMedications.mockRejectedValueOnce(new Error('Network Error'));
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('등록된 약물이 없어요')).toBeTruthy();
    });
  });

  // =========================================================================
  // 10. Navigation
  // =========================================================================
  it('back button calls goBack', () => {
    mockGetMedications.mockReturnValue(new Promise(() => {}));
    const { getByLabelText } = render(<MedicationScreen />);
    fireEvent.press(getByLabelText('뒤로 가기'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
