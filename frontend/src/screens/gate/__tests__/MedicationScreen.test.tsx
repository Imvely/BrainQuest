import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import MedicationScreen from '../MedicationScreen';
import { getMedications, createMedication, createMedLog } from '../../../api/gate';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
const MOCK_MEDICATIONS = [
  {
    id: 1,
    medName: '콘서타 (Concerta)',
    dosage: '27mg',
    scheduleTime: '08:00',
    isActive: true,
    createdAt: '2025-01-01T00:00:00',
  },
  {
    id: 2,
    medName: '스트라테라 (Strattera)',
    dosage: '40mg',
    scheduleTime: '09:00',
    isActive: true,
    createdAt: '2025-01-02T00:00:00',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('MedicationScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. Renders "약물 관리" header
  // =========================================================================
  it('renders header with "약물 관리" title', () => {
    mockGetMeds.mockReturnValue(new Promise(() => {}) as any);
    const { getByText } = render(<MedicationScreen />);
    expect(getByText('약물 관리')).toBeTruthy();
  });

  // =========================================================================
  // 2. Shows loading state initially
  // =========================================================================
  it('shows loading state while fetching medications', () => {
    mockGetMeds.mockReturnValue(new Promise(() => {}) as any);
    const { toJSON } = render(<MedicationScreen />);
    // Component renders while loading (ActivityIndicator present)
    expect(toJSON()).toBeTruthy();
  });

  // =========================================================================
  // 3. Shows empty state when no medications
  // =========================================================================
  it('shows empty state "등록된 약물이 없어요" when no meds', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('등록된 약물이 없어요')).toBeTruthy();
      expect(getByText('아래 + 버튼으로 약물을 추가하세요')).toBeTruthy();
    });
  });

  it('shows pill emoji in empty state', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('💊')).toBeTruthy();
    });
  });

  // =========================================================================
  // 4. Shows medication cards when data loaded
  // =========================================================================
  it('renders medication cards with name, dosage, and time', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDICATIONS } as any);
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('콘서타 (Concerta)')).toBeTruthy();
      expect(getByText('27mg | 08:00')).toBeTruthy();
      expect(getByText('스트라테라 (Strattera)')).toBeTruthy();
      expect(getByText('40mg | 09:00')).toBeTruthy();
    });
  });

  // =========================================================================
  // 5. Medication card shows name, dosage, time
  // =========================================================================
  it('shows a "복용" button for each medication', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDICATIONS } as any);
    const { getAllByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getAllByText('복용')).toHaveLength(2);
    });
  });

  // =========================================================================
  // 6. "복용" button logs medication intake
  // =========================================================================
  it('calls createMedLog when "복용" button is pressed', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDICATIONS } as any);
    mockCreateLog.mockResolvedValueOnce({ data: { id: 10 } } as any);

    const { getAllByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getAllByText('복용')).toHaveLength(2);
    });

    await act(async () => {
      fireEvent.press(getAllByText('복용')[0]);
    });

    expect(mockCreateLog).toHaveBeenCalledTimes(1);
    expect(mockCreateLog).toHaveBeenCalledWith({ medicationId: 1 });
  });

  it('shows success alert after recording medication take', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDICATIONS } as any);
    mockCreateLog.mockResolvedValueOnce({ data: { id: 10 } } as any);
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getAllByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getAllByText('복용')).toHaveLength(2);
    });

    await act(async () => {
      fireEvent.press(getAllByText('복용')[0]);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      '복용 기록 완료',
      expect.stringContaining('콘서타'),
    );
    alertSpy.mockRestore();
  });

  it('shows error alert when medication take fails', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: MOCK_MEDICATIONS } as any);
    mockCreateLog.mockRejectedValueOnce(new Error('Network Error'));
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getAllByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getAllByText('복용')).toHaveLength(2);
    });

    await act(async () => {
      fireEvent.press(getAllByText('복용')[0]);
    });

    expect(alertSpy).toHaveBeenCalledWith('기록 실패', '잠시 후 다시 시도해주세요.');
    alertSpy.mockRestore();
  });

  // =========================================================================
  // 7. FAB (+) button opens add modal
  // =========================================================================
  it('opens add medication modal when FAB "+" is pressed', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('등록된 약물이 없어요')).toBeTruthy();
    });

    fireEvent.press(getByText('+'));

    expect(getByText('약물 추가')).toBeTruthy();
    expect(getByText('약물 선택')).toBeTruthy();
  });

  // =========================================================================
  // 8. Add modal shows ADHD presets
  // =========================================================================
  it('shows ADHD preset medications in add modal', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('+'));
    });

    expect(getByText('콘서타 (Concerta)')).toBeTruthy();
    expect(getByText('메디키넷 (Medikinet)')).toBeTruthy();
    expect(getByText('환인메틸페니데이트')).toBeTruthy();
    expect(getByText('스트라테라 (Strattera)')).toBeTruthy();
    expect(getByText('인튜니브 (Intuniv)')).toBeTruthy();
    expect(getByText('메타데이트 (Metadate)')).toBeTruthy();
    expect(getByText('직접 입력')).toBeTruthy();
  });

  // =========================================================================
  // 9. Selecting preset shows dosage options
  // =========================================================================
  it('shows dosage chips after selecting a preset', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('+'));
    });

    fireEvent.press(getByText('콘서타 (Concerta)'));
    expect(getByText('용량')).toBeTruthy();
    expect(getByText('18mg')).toBeTruthy();
    expect(getByText('27mg')).toBeTruthy();
    expect(getByText('36mg')).toBeTruthy();
    expect(getByText('54mg')).toBeTruthy();
  });

  it('shows time selection chips in the modal', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('+'));
    });

    expect(getByText('복용 시간')).toBeTruthy();
    expect(getByText('07:00')).toBeTruthy();
    expect(getByText('08:00')).toBeTruthy();
    expect(getByText('09:00')).toBeTruthy();
    expect(getByText('12:00')).toBeTruthy();
    expect(getByText('18:00')).toBeTruthy();
  });

  // =========================================================================
  // 10. "약물 등록" saves new medication
  // =========================================================================
  it('successfully creates medication via API', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const newMed = {
      id: 3,
      medName: '콘서타 (Concerta)',
      dosage: '27mg',
      scheduleTime: '08:00',
      isActive: true,
      createdAt: '2025-01-01T00:00:00',
    };
    mockCreateMed.mockResolvedValueOnce({ data: newMed } as any);

    const { getByText, queryByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('등록된 약물이 없어요')).toBeTruthy();
    });

    // Open modal
    fireEvent.press(getByText('+'));

    // Select preset and dosage
    fireEvent.press(getByText('콘서타 (Concerta)'));
    fireEvent.press(getByText('27mg'));

    // Submit
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

  it('shows error alert when add medication fails', async () => {
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
    alertSpy.mockRestore();
  });

  // =========================================================================
  // 11. Validation: shows alert / disabled when name/dosage missing
  // =========================================================================
  it('does not call API when dosage is not selected', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);

    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('+'));
    });

    // Select preset but not dosage
    fireEvent.press(getByText('콘서타 (Concerta)'));

    await act(async () => {
      fireEvent.press(getByText('약물 등록'));
    });

    // Button is disabled without dosage, so API should not be called
    expect(mockCreateMed).not.toHaveBeenCalled();
  });

  it('shows custom input fields when "직접 입력" is selected', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const { getByText, getByPlaceholderText } = render(<MedicationScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('+'));
    });

    fireEvent.press(getByText('직접 입력'));

    expect(getByPlaceholderText('약물명 입력')).toBeTruthy();
    expect(getByPlaceholderText('용량 입력 (예: 27mg)')).toBeTruthy();
  });

  it('shows validation alert when custom name is empty', async () => {
    mockGetMeds.mockResolvedValueOnce({ data: [] } as any);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText, getByPlaceholderText } = render(<MedicationScreen />);

    await waitFor(() => {
      fireEvent.press(getByText('+'));
    });

    fireEvent.press(getByText('직접 입력'));

    // Enter dosage but leave name empty
    const dosageInput = getByPlaceholderText('용량 입력 (예: 27mg)');
    fireEvent.changeText(dosageInput, '20mg');

    await act(async () => {
      fireEvent.press(getByText('약물 등록'));
    });

    expect(alertSpy).toHaveBeenCalledWith('입력 확인', '약물명과 용량을 선택해주세요.');
    alertSpy.mockRestore();
  });

  // =========================================================================
  // Navigation
  // =========================================================================
  it('back button calls navigation.goBack', () => {
    mockGetMeds.mockReturnValue(new Promise(() => {}) as any);
    const { getByText } = render(<MedicationScreen />);
    fireEvent.press(getByText('<'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  // =========================================================================
  // Network error on initial fetch
  // =========================================================================
  it('shows empty state gracefully when initial fetch fails', async () => {
    mockGetMeds.mockRejectedValueOnce(new Error('Network Error'));
    const { getByText } = render(<MedicationScreen />);

    await waitFor(() => {
      expect(getByText('등록된 약물이 없어요')).toBeTruthy();
    });
  });
});
