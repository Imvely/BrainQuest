import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EmotionRecordScreen from '../EmotionRecordScreen';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupMutateCallbacks() {
  let captured: { onSuccess?: (data: unknown) => void; onError?: () => void } = {};
  mockMutate.mockImplementation((_payload: unknown, callbacks: typeof captured) => {
    captured = callbacks || {};
  });
  return {
    triggerSuccess: (data?: unknown) => captured.onSuccess?.(data),
    triggerError: () => captured.onError?.(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('EmotionRecordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.todayCount = 2;
  });

  // 1. Renders header with "감정 기록" title
  it('renders "감정 기록" header', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    expect(getByText('감정 기록')).toBeTruthy();
  });

  // 2. Shows "지금 당신의 하늘은?" text
  it('shows "지금 당신의 하늘은?" text', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    expect(getByText('지금 당신의 하늘은?')).toBeTruthy();
  });

  // 3. Renders weather picker with all 7 weather types
  it('renders weather picker with all 7 weather types', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    expect(getByText('맑음')).toBeTruthy();
    expect(getByText('구름 약간')).toBeTruthy();
    expect(getByText('흐림')).toBeTruthy();
    expect(getByText('안개')).toBeTruthy();
    expect(getByText('비')).toBeTruthy();
    expect(getByText('번개')).toBeTruthy();
    expect(getByText('폭풍')).toBeTruthy();
  });

  // 4. Submit button not visible when no weather selected
  it('does not show submit button when no weather is selected', () => {
    const { queryByText } = render(<EmotionRecordScreen />);
    expect(queryByText('기록하기')).toBeNull();
  });

  // 5. Selecting a weather shows intensity section
  it('shows intensity section after selecting a weather', () => {
    const { getByText, queryByText } = render(<EmotionRecordScreen />);
    expect(queryByText('감정 강도')).toBeNull();

    fireEvent.press(getByText('맑음'));
    expect(getByText('감정 강도')).toBeTruthy();
  });

  // 6. Intensity shows 5 levels with default at 3/5
  it('shows intensity default value "3 / 5"', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));
    expect(getByText('3 / 5')).toBeTruthy();
  });

  // 7. Shows tag section when toggled
  it('shows tag section with preset tags when toggled', () => {
    const { getByText, queryByText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));

    // Tags not visible initially
    expect(queryByText('#회의후')).toBeNull();

    // Toggle tags open
    fireEvent.press(getByText('태그'));
    expect(getByText('#회의후')).toBeTruthy();
    expect(getByText('#피곤')).toBeTruthy();
    expect(getByText('#RSD')).toBeTruthy();
    expect(getByText('#약물복용후')).toBeTruthy();
    expect(getByText('#수면부족')).toBeTruthy();
  });

  // 8. Shows memo input with placeholder
  it('shows memo input with placeholder when toggled', () => {
    const { getByText, getByPlaceholderText, queryByPlaceholderText } =
      render(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));

    expect(queryByPlaceholderText(/오늘의 감정에 대해/)).toBeNull();

    fireEvent.press(getByText('메모'));
    expect(getByPlaceholderText('오늘의 감정에 대해 적어보세요...')).toBeTruthy();
  });

  // 9. Memo character counter shows "0/200"
  it('shows memo character counter "0/200" when memo is open', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));
    fireEvent.press(getByText('메모'));
    expect(getByText('0/200')).toBeTruthy();
  });

  // 10. Typing in memo updates character counter
  it('updates character counter as user types', () => {
    const { getByText, getByPlaceholderText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));
    fireEvent.press(getByText('메모'));

    const memoInput = getByPlaceholderText('오늘의 감정에 대해 적어보세요...');
    fireEvent.changeText(memoInput, '좋아요');
    expect(getByText('3/200')).toBeTruthy();
  });

  // 11. Submit button calls createEmotion mutation
  it('calls createEmotion mutation on submit', async () => {
    mockMutate.mockImplementation(() => {});
    const { getByText } = render(<EmotionRecordScreen />);
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

  // 12. Shows daily limit counter "{count}/{max}"
  it('shows daily limit counter "2/5"', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    expect(getByText('2/5')).toBeTruthy();
  });

  // 13. Disables submit when daily limit reached
  it('shows "오늘 기록 완료" when daily limit reached', () => {
    mockState.todayCount = 5;
    const { getByText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));
    expect(getByText('오늘 기록 완료')).toBeTruthy();
    expect(getByText('5/5')).toBeTruthy();
  });

  // 14. Toast appears on successful submission
  it('shows toast on successful submission', async () => {
    const { triggerSuccess } = setupMutateCallbacks();
    const { getByText, queryByText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));

    await act(async () => {
      fireEvent.press(getByText('기록하기'));
    });

    await act(async () => {
      triggerSuccess({});
    });

    // Toast component renders reward message
    expect(getByText('+5 DEF EXP 획득!')).toBeTruthy();
  });

  // 15. Shows alert on submission error
  it('shows alert on submission error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { triggerError } = setupMutateCallbacks();
    const { getByText } = render(<EmotionRecordScreen />);
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

  // 16. Navigates back on header back button
  it('navigates back on header back button press', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('<'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  // 17. Selecting different weather types works
  it('can select different weather types', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('비'));
    expect(getByText('감정 강도')).toBeTruthy();
    expect(getByText('기록하기')).toBeTruthy();
  });

  // 18. Custom tag input
  it('shows custom tag input inside tags section', () => {
    const { getByText, getByPlaceholderText } = render(<EmotionRecordScreen />);
    fireEvent.press(getByText('맑음'));
    fireEvent.press(getByText('태그'));
    expect(getByPlaceholderText('커스텀 태그')).toBeTruthy();
  });
});
