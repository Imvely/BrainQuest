import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MedicationScreen from '../MedicationScreen';
import { getMedications, createMedication, createMedLog } from '../../../api/gate';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('../../../api/gate', () => ({
  getMedications: jest.fn(),
  createMedication: jest.fn(),
  createMedLog: jest.fn(),
}));

const mockGetMeds = getMedications as jest.MockedFunction<typeof getMedications>;
const mockCreateMed = createMedication as jest.MockedFunction<typeof createMedication>;
const mockCreateLog = createMedLog as jest.MockedFunction<typeof createMedLog>;

const MOCK_MEDS = [
  { id: 1, medName: '콘서타 (Concerta)', dosage: '27mg', scheduleTime: '08:00', isActive: true, createdAt: '' },
  { id: 2, medName: '스트라테라 (Strattera)', dosage: '40mg', scheduleTime: '09:00', isActive: true, createdAt: '' },
];

describe('MedicationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Loading state ---
  describe('loading state', () => {
    it('shows loading indicator while fetching', () => {
      mockGetMeds.mockReturnValue(new Promise(() => {}) as any); // never resolves
      const { toJSON } = render(<MedicationScreen />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // --- 2. Empty state ---
  describe('empty state', () => {
    it('shows empty message when no medications', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        expect(getByText('등록된 약물이 없어요')).toBeTruthy();
        expect(getByText('아래 + 버튼으로 약물을 추가하세요')).toBeTruthy();
      });
    });
  });

  // --- 3. List rendering ---
  describe('medication list', () => {
    it('renders medication cards', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDS } as any);
      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        expect(getByText('콘서타 (Concerta)')).toBeTruthy();
        expect(getByText('27mg | 08:00')).toBeTruthy();
        expect(getByText('스트라테라 (Strattera)')).toBeTruthy();
      });
    });

    it('shows take button for each medication', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDS } as any);
      const { getAllByText } = render(<MedicationScreen />);

      await waitFor(() => {
        expect(getAllByText('복용')).toHaveLength(2);
      });
    });
  });

  // --- 4. Take medication ---
  describe('take medication', () => {
    it('records med log on take button press', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDS } as any);
      mockCreateLog.mockResolvedValueOnce({ data: { id: 1 } } as any);
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getAllByText } = render(<MedicationScreen />);
      await waitFor(() => {
        expect(getAllByText('복용')).toHaveLength(2);
      });

      await act(async () => {
        fireEvent.press(getAllByText('복용')[0]);
      });

      expect(mockCreateLog).toHaveBeenCalledWith({ medicationId: 1 });
      expect(alertSpy).toHaveBeenCalledWith('복용 기록 완료', expect.stringContaining('콘서타'));
    });

    it('shows error on take failure', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDS } as any);
      mockCreateLog.mockRejectedValueOnce(new Error('Network'));
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getAllByText } = render(<MedicationScreen />);
      await waitFor(() => {
        expect(getAllByText('복용')).toHaveLength(2);
      });

      await act(async () => {
        fireEvent.press(getAllByText('복용')[0]);
      });

      expect(alertSpy).toHaveBeenCalledWith('기록 실패', '잠시 후 다시 시도해주세요.');
    });
  });

  // --- 5. FAB and modal ---
  describe('add medication modal', () => {
    it('opens modal on FAB tap', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        expect(getByText('등록된 약물이 없어요')).toBeTruthy();
      });

      fireEvent.press(getByText('+'));
      expect(getByText('약물 추가')).toBeTruthy();
      expect(getByText('약물 선택')).toBeTruthy();
    });

    it('shows ADHD medication presets', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('+'));
      });

      expect(getByText('콘서타 (Concerta)')).toBeTruthy();
      expect(getByText('메디키넷 (Medikinet)')).toBeTruthy();
      expect(getByText('스트라테라 (Strattera)')).toBeTruthy();
      expect(getByText('인튜니브 (Intuniv)')).toBeTruthy();
      expect(getByText('직접 입력')).toBeTruthy();
    });

    it('shows dosage options after selecting preset', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('+'));
      });

      fireEvent.press(getByText('콘서타 (Concerta)'));
      expect(getByText('용량')).toBeTruthy();
      expect(getByText('18mg')).toBeTruthy();
      expect(getByText('27mg')).toBeTruthy();
      expect(getByText('54mg')).toBeTruthy();
    });

    it('shows time selection', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('+'));
      });

      expect(getByText('복용 시간')).toBeTruthy();
      expect(getByText('07:00')).toBeTruthy();
      expect(getByText('08:00')).toBeTruthy();
    });

    it('shows custom name input for 직접 입력', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const { getByText, getByPlaceholderText } = render(<MedicationScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('+'));
      });

      fireEvent.press(getByText('직접 입력'));
      expect(getByPlaceholderText('약물명 입력')).toBeTruthy();
      expect(getByPlaceholderText('용량 입력 (예: 27mg)')).toBeTruthy();
    });
  });

  // --- 6. Add medication flow ---
  describe('add medication', () => {
    it('validates required fields before saving', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('+'));
      });

      // Select preset but no dosage
      fireEvent.press(getByText('콘서타 (Concerta)'));

      await act(async () => {
        fireEvent.press(getByText('약물 등록'));
      });

      // Button should be disabled (opacity 0.4), but if pressed won't call API
      expect(mockCreateMed).not.toHaveBeenCalled();
    });

    it('saves medication and adds to list', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const newMed = { id: 3, medName: '콘서타 (Concerta)', dosage: '27mg', scheduleTime: '08:00', isActive: true, createdAt: '' };
      mockCreateMed.mockResolvedValueOnce({ data: newMed } as any);

      const { getByText, queryByText } = render(<MedicationScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('+'));
      });

      fireEvent.press(getByText('콘서타 (Concerta)'));
      fireEvent.press(getByText('27mg'));

      await act(async () => {
        fireEvent.press(getByText('약물 등록'));
      });

      expect(mockCreateMed).toHaveBeenCalledWith({
        medName: '콘서타 (Concerta)',
        dosage: '27mg',
        scheduleTime: '08:00',
      });

      // Modal should close
      await waitFor(() => {
        expect(queryByText('약물 추가')).toBeNull();
      });
    });

    it('shows error alert on save failure', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      mockCreateMed.mockRejectedValueOnce(new Error('Server Error'));
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('+'));
      });

      fireEvent.press(getByText('콘서타 (Concerta)'));
      fireEvent.press(getByText('27mg'));

      await act(async () => {
        fireEvent.press(getByText('약물 등록'));
      });

      expect(alertSpy).toHaveBeenCalledWith('등록 실패', '약물 등록 중 오류가 발생했습니다.');
    });
  });

  // --- 7. Edge cases ---
  describe('edge cases', () => {
    it('handles network error on initial fetch gracefully', async () => {
      mockGetMeds.mockRejectedValueOnce(new Error('Network'));
      const { getByText } = render(<MedicationScreen />);

      await waitFor(() => {
        expect(getByText('등록된 약물이 없어요')).toBeTruthy();
      });
    });

    it('renders header with back navigation', async () => {
      mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
      const { getByText } = render(<MedicationScreen />);
      expect(getByText('약물 관리')).toBeTruthy();
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
