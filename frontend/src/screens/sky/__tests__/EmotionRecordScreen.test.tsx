import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmotionRecordScreen from '../EmotionRecordScreen';

// --- Navigation mock ---
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

// --- Hook mocks ---
const mockMutate = jest.fn();
jest.mock('../../../hooks/useEmotions', () => ({
  useCreateEmotion: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

const mockState = {
  todayCount: 2,
  recentWeather: null,
  recentRecords: [],
  addRecord: jest.fn(),
};
jest.mock('../../../stores/useEmotionStore', () => ({
  useEmotionStore: Object.assign(
    (selector: (state: typeof mockState) => unknown) => selector(mockState),
    { getState: () => mockState },
  ),
}));

// --- Helpers ---
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

function setupMutateCallbacks() {
  let captured: { onSuccess?: (data: unknown) => void; onError?: () => void } = {};
  mockMutate.mockImplementation((_payload: unknown, callbacks: typeof captured) => {
    captured = callbacks || {};
  });
  return {
    triggerSuccess: (data: unknown) => captured.onSuccess?.(data),
    triggerError: () => captured.onError?.(),
  };
}

describe('EmotionRecordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.todayCount = 2;
  });

  it('renders title and counter', () => {
    const { getByText } = renderWithProviders(<EmotionRecordScreen />);
    expect(getByText('지금 당신의 하늘은?')).toBeTruthy();
    expect(getByText('2/5')).toBeTruthy();
  });

  it('shows all 7 weather options', () => {
    const { getByText } = renderWithProviders(<EmotionRecordScreen />);
    expect(getByText('맑음')).toBeTruthy();
    expect(getByText('구름 약간')).toBeTruthy();
    expect(getByText('흐림')).toBeTruthy();
    expect(getByText('안개')).toBeTruthy();
    expect(getByText('비')).toBeTruthy();
    expect(getByText('번개')).toBeTruthy();
    expect(getByText('폭풍')).toBeTruthy();
  });

  it('shows intensity section after weather selection', () => {
    const { getByText, queryByText } = renderWithProviders(<EmotionRecordScreen />);
    expect(queryByText('감정 강도')).toBeNull();

    fireEvent.press(getByText('맑음'));
    expect(getByText('감정 강도')).toBeTruthy();
    expect(getByText('3 / 5')).toBeTruthy();
  });

  it('shows tags section when toggled', () => {
    const { getByText, queryByText } = renderWithProviders(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));

    expect(queryByText('#회의후')).toBeNull();
    fireEvent.press(getByText('태그'));
    expect(getByText('#회의후')).toBeTruthy();
    expect(getByText('#피곤')).toBeTruthy();
    expect(getByText('#RSD')).toBeTruthy();
  });

  it('shows memo section when toggled', () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } =
      renderWithProviders(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));

    expect(queryByPlaceholderText(/오늘의 감정에 대해/)).toBeNull();
    fireEvent.press(getByText('메모'));
    expect(getByPlaceholderText(/오늘의 감정에 대해/)).toBeTruthy();
  });

  it('shows "기록하기" button after weather selection', () => {
    const { getByText } = renderWithProviders(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));
    expect(getByText('기록하기')).toBeTruthy();
  });

  it('submits emotion record with correct payload', async () => {
    mockMutate.mockImplementation(() => {});

    const { getByText } = renderWithProviders(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));

    await act(async () => {
      fireEvent.press(getByText('기록하기'));
    });

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        weatherType: 'SUNNY',
        intensity: 3,
        recordedAt: expect.any(String),
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it('shows alert on submission error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { triggerError } = setupMutateCallbacks();

    const { getByText } = renderWithProviders(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));

    await act(async () => {
      fireEvent.press(getByText('기록하기'));
    });

    await act(async () => {
      triggerError();
    });

    expect(alertSpy).toHaveBeenCalledWith('기록 실패', expect.any(String));
    alertSpy.mockRestore();
  });

  it('disables submit when daily limit reached', () => {
    mockState.todayCount = 5;

    const { getByText } = renderWithProviders(<EmotionRecordScreen />);
    expect(getByText('5/5')).toBeTruthy();

    fireEvent.press(getByText('맑음'));
    expect(getByText('오늘 기록 완료')).toBeTruthy();
  });

  it('navigates back on header back button', () => {
    const { getByText } = renderWithProviders(<EmotionRecordScreen />);
    fireEvent.press(getByText('<'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
