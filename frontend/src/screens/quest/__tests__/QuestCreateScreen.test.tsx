import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuestCreateScreen from '../QuestCreateScreen';
import { QuestGenerateResponse } from '../../../types/quest';

// --- Navigation mock ---
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// --- Hook & API mocks ---
const mockMutate = jest.fn();
let mockGenerateQuestReturn: {
  mutate: jest.Mock;
  isPending: boolean;
};

jest.mock('../../../hooks/useQuests', () => ({
  useGenerateQuest: () => mockGenerateQuestReturn,
}));

const mockCreateQuest = jest.fn();
jest.mock('../../../api/quest', () => ({
  createQuest: (...args: unknown[]) => mockCreateQuest(...args),
}));

// --- Fixtures ---
const generatedResult: QuestGenerateResponse = {
  questTitle: '마왕의 식기 정화 퀘스트',
  questStory: '어둠의 식기들이 싱크대를 점령했다! 용사여 수세미를 들어라.',
  grade: 'E',
  estimatedMin: 10,
  expReward: 10,
  goldReward: 5,
  checkpoints: [
    { orderNum: 1, title: '수세미 장비 장착', estimatedMin: 3, expReward: 3, goldReward: 2 },
    { orderNum: 2, title: '접시 정화 시작', estimatedMin: 7, expReward: 7, goldReward: 3 },
  ],
};

// --- Helpers ---
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

/**
 * Simulate the mutation flow: when mutate is called, it captures
 * the onSuccess/onError callbacks, allowing us to trigger them manually.
 */
function setupMutateWithCallbacks() {
  let capturedCallbacks: { onSuccess?: (data: any) => void; onError?: () => void } = {};

  mockMutate.mockImplementation((_payload: any, callbacks: any) => {
    capturedCallbacks = callbacks || {};
  });

  return {
    triggerSuccess: (data: any) => capturedCallbacks.onSuccess?.(data),
    triggerError: () => capturedCallbacks.onError?.(),
  };
}

describe('QuestCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateQuestReturn = {
      mutate: mockMutate,
      isPending: false,
    };
  });

  // --- 1. Step 1: renders header, TextInput, time buttons ---
  it('renders "퀘스트 생성" header, TextInput, and time buttons', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    expect(getByText('퀘스트 생성')).toBeTruthy();
    expect(getByPlaceholderText(/설거지, 보고서 작성/)).toBeTruthy();
    expect(getByText('5m')).toBeTruthy();
    expect(getByText('10m')).toBeTruthy();
    expect(getByText('15m')).toBeTruthy();
    expect(getByText('30m')).toBeTruthy();
    expect(getByText('1h')).toBeTruthy();
    expect(getByText('1.5h')).toBeTruthy();
    expect(getByText('2h')).toBeTruthy();
    expect(getByText('3h')).toBeTruthy();
  });

  // --- 2. Generate button disabled when title empty ---
  it('"퀘스트 변환!" button is disabled when title is empty', () => {
    const { getByText } = renderWithProviders(<QuestCreateScreen />);
    const btn = getByText('퀘스트 변환!');
    fireEvent.press(btn);
    // mutate should not be called because button is disabled
    expect(mockMutate).not.toHaveBeenCalled();
  });

  // --- 3. Entering title enables generate button ---
  it('entering title enables generate button', () => {
    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    const input = getByPlaceholderText(/설거지/);
    fireEvent.changeText(input, '보고서 작성');

    // Button should now be present and pressable
    const btn = getByText('퀘스트 변환!');
    expect(btn).toBeTruthy();
    expect(input.props.value).toBe('보고서 작성');
  });

  // --- 4. Time button "30m" is initially active (estimatedMin=30) ---
  it('time button "30m" is initially active with D grade preview', () => {
    const { getByText } = renderWithProviders(<QuestCreateScreen />);
    // Default estimatedMin is 30 => D급
    expect(getByText('D급')).toBeTruthy();
    expect(getByText('30분')).toBeTruthy();
  });

  // --- 5. Selecting different time updates grade preview ---
  it('selecting different time updates grade preview', () => {
    const { getByText } = renderWithProviders(<QuestCreateScreen />);

    // Tap 10m -> E급
    fireEvent.press(getByText('10m'));
    expect(getByText('E급')).toBeTruthy();
    expect(getByText('10분')).toBeTruthy();

    // Tap 1h -> C급
    fireEvent.press(getByText('1h'));
    expect(getByText('C급')).toBeTruthy();
    expect(getByText('60분')).toBeTruthy();

    // Tap 2h -> B급
    fireEvent.press(getByText('2h'));
    expect(getByText('B급')).toBeTruthy();
    expect(getByText('120분')).toBeTruthy();

    // Tap 3h -> A급
    fireEvent.press(getByText('3h'));
    expect(getByText('A급')).toBeTruthy();
    expect(getByText('180분')).toBeTruthy();
  });

  // --- 6. Pressing generate with title triggers mutation ---
  it('pressing generate with title triggers mutate function', async () => {
    mockMutate.mockImplementation(() => {}); // no-op, stays on step 2

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        originalTitle: '설거지',
        estimatedMin: 30,
        category: 'WORK',
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  // --- 7. Step 2: shows "마법진 가동 중..." during loading ---
  it('shows "마법진 가동 중..." during loading (step 2)', async () => {
    mockMutate.mockImplementation(() => {
      // Do nothing - stays on step 2
    });

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    expect(getByText('마법진 가동 중...')).toBeTruthy();
    expect(getByText(/설거지/)).toBeTruthy();
  });

  // --- 8. Step 3: shows result after successful generation ---
  it('shows result after successful generation (step 3)', async () => {
    const { triggerSuccess } = setupMutateWithCallbacks();

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    // Simulate successful mutation response
    await act(async () => {
      triggerSuccess({ data: generatedResult });
    });

    await waitFor(() => {
      expect(getByText('퀘스트 변환 완료')).toBeTruthy();
      expect(getByText('마왕의 식기 정화 퀘스트')).toBeTruthy();
      expect(getByText(/어둠의 식기들/)).toBeTruthy();
      expect(getByText('E급 퀘스트')).toBeTruthy();
      expect(getByText('+10 XP')).toBeTruthy();
      expect(getByText('+5 G')).toBeTruthy();
      expect(getByText('수세미 장비 장착')).toBeTruthy();
      expect(getByText('접시 정화 시작')).toBeTruthy();
    });
  });

  // --- 9. "이 퀘스트로 시작!" calls createQuest API and navigates back ---
  it('"이 퀘스트로 시작!" calls createQuest API and navigates back', async () => {
    const { triggerSuccess } = setupMutateWithCallbacks();
    mockCreateQuest.mockResolvedValue({ success: true, data: {}, message: '' });

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    await act(async () => {
      triggerSuccess({ data: generatedResult });
    });

    await waitFor(() => getByText('이 퀘스트로 시작!'));
    await act(async () => {
      fireEvent.press(getByText('이 퀘스트로 시작!'));
    });

    await waitFor(() => {
      expect(mockCreateQuest).toHaveBeenCalledWith(
        expect.objectContaining({
          originalTitle: '설거지',
          questTitle: '마왕의 식기 정화 퀘스트',
          category: 'WORK',
        }),
      );
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // --- 10. "다시 변환" returns to step 1 ---
  it('"다시 변환" returns to step 1', async () => {
    const { triggerSuccess } = setupMutateWithCallbacks();

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    await act(async () => {
      triggerSuccess({ data: generatedResult });
    });

    await waitFor(() => getByText('다시 변환'));
    fireEvent.press(getByText('다시 변환'));

    await waitFor(() => {
      expect(getByText('퀘스트 생성')).toBeTruthy();
      expect(getByPlaceholderText(/설거지/)).toBeTruthy();
    });
  });

  // --- 11. Category chips are selectable ---
  it('category chips are selectable', () => {
    const { getByText } = renderWithProviders(<QuestCreateScreen />);
    expect(getByText('업무')).toBeTruthy();
    expect(getByText('가사')).toBeTruthy();
    expect(getByText('건강')).toBeTruthy();
    expect(getByText('사회')).toBeTruthy();
    expect(getByText('자기관리')).toBeTruthy();

    // Switch category (no crash)
    fireEvent.press(getByText('건강'));
    expect(getByText('건강')).toBeTruthy();

    fireEvent.press(getByText('자기관리'));
    expect(getByText('자기관리')).toBeTruthy();
  });

  // --- Additional: back button ---
  it('back button calls goBack', () => {
    const { getByText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.press(getByText('<'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  // --- Additional: error returns to step 1 ---
  it('shows alert and returns to step 1 on mutation error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { triggerError } = setupMutateWithCallbacks();

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    // Step 2 should be showing
    expect(getByText('마법진 가동 중...')).toBeTruthy();

    await act(async () => {
      triggerError();
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('변환 실패', expect.any(String));
      expect(getByText('퀘스트 생성')).toBeTruthy();
    });

    alertSpy.mockRestore();
  });

  // --- Additional: save failure shows alert ---
  it('shows alert on save failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { triggerSuccess } = setupMutateWithCallbacks();
    mockCreateQuest.mockRejectedValue(new Error('Save error'));

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    await act(async () => {
      triggerSuccess({ data: generatedResult });
    });

    await waitFor(() => getByText('이 퀘스트로 시작!'));
    await act(async () => {
      fireEvent.press(getByText('이 퀘스트로 시작!'));
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('저장 실패', expect.any(String));
    });

    alertSpy.mockRestore();
  });

  // --- Additional: due date input ---
  it('accepts due date input', () => {
    const { getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    const dateInput = getByPlaceholderText('YYYY-MM-DD');
    fireEvent.changeText(dateInput, '2026-05-01');
    expect(dateInput.props.value).toBe('2026-05-01');
  });

  // --- Additional: timeline toggle on result ---
  it('shows timeline toggle on result screen', async () => {
    const { triggerSuccess } = setupMutateWithCallbacks();

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    await act(async () => {
      triggerSuccess({ data: generatedResult });
    });

    await waitFor(() => {
      expect(getByText('타임라인에 배치할까요?')).toBeTruthy();
    });
  });

  // --- Additional: mutation uses selected category ---
  it('mutation uses selected category when generating', async () => {
    mockMutate.mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '운동하기');
    fireEvent.press(getByText('건강'));

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        originalTitle: '운동하기',
        category: 'HEALTH',
      }),
      expect.any(Object),
    );
  });
});
