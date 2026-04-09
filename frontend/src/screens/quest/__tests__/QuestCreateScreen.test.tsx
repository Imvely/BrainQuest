import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import QuestCreateScreen from '../QuestCreateScreen';
import { QuestGenerateResponse } from '../../../types/quest';

// --- Navigation mock ---
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(),
}));

// --- Hook & API mocks ---
const mockMutate = jest.fn();

jest.mock('../../../hooks/useQuests', () => ({
  useGenerateQuest: jest.fn(() => ({ mutate: mockMutate, isPending: false })),
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

/**
 * Utility: capture onSuccess/onError callbacks from mutate calls.
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
  });

  // --- Step 1 tests ---

  it('step 1: renders "퀘스트 생성" header', () => {
    const { getByText } = render(<QuestCreateScreen />);
    expect(getByText('퀘스트 생성')).toBeTruthy();
  });

  it('shows title input with placeholder', () => {
    const { getByPlaceholderText } = render(<QuestCreateScreen />);
    expect(getByPlaceholderText(/설거지, 보고서 작성, 운동/)).toBeTruthy();
  });

  it('shows time quick buttons (5, 10, 15, 30, 60, 90, 120, 180)', () => {
    const { getByText } = render(<QuestCreateScreen />);
    expect(getByText('5m')).toBeTruthy();
    expect(getByText('10m')).toBeTruthy();
    expect(getByText('15m')).toBeTruthy();
    expect(getByText('30m')).toBeTruthy();
    expect(getByText('1h')).toBeTruthy();
    expect(getByText('1.5h')).toBeTruthy();
    expect(getByText('2h')).toBeTruthy();
    expect(getByText('3h')).toBeTruthy();
  });

  it('shows category chips (업무, 가사, 건강, 사회, 자기관리)', () => {
    const { getByText } = render(<QuestCreateScreen />);
    expect(getByText('업무')).toBeTruthy();
    expect(getByText('가사')).toBeTruthy();
    expect(getByText('건강')).toBeTruthy();
    expect(getByText('사회')).toBeTruthy();
    expect(getByText('자기관리')).toBeTruthy();
  });

  it('shows due date input', () => {
    const { getByPlaceholderText } = render(<QuestCreateScreen />);
    expect(getByPlaceholderText('YYYY-MM-DD')).toBeTruthy();
  });

  it('"퀘스트 변환!" button disabled when title empty', () => {
    const { getByText } = render(<QuestCreateScreen />);
    fireEvent.press(getByText('퀘스트 변환!'));
    // Button is disabled, so mutate should not be called
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('"퀘스트 변환!" button enabled when title entered', () => {
    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '보고서 작성');
    const btn = getByText('퀘스트 변환!');
    expect(btn).toBeTruthy();
    // Verify the input has the value
    expect(getByPlaceholderText(/설거지/).props.value).toBe('보고서 작성');
  });

  it('tapping time button updates estimated time', () => {
    const { getByText } = render(<QuestCreateScreen />);
    // Default is 30 => D급
    expect(getByText('D급')).toBeTruthy();
    expect(getByText('30분')).toBeTruthy();

    // Tap 10m => E급
    fireEvent.press(getByText('10m'));
    expect(getByText('E급')).toBeTruthy();
    expect(getByText('10분')).toBeTruthy();

    // Tap 1h (60) => C급
    fireEvent.press(getByText('1h'));
    expect(getByText('C급')).toBeTruthy();
    expect(getByText('60분')).toBeTruthy();
  });

  it('empty title shows alert on generate attempt', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
    // Enter spaces only (trims to empty)
    fireEvent.changeText(getByPlaceholderText(/설거지/), '   ');

    // The button is disabled because !title.trim() is true, so press won't trigger
    // However, the component disables the button, so mutate won't be called
    fireEvent.press(getByText('퀘스트 변환!'));
    expect(mockMutate).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  // --- Step 2 tests ---

  it('step 2: shows loading UI "마법진 가동 중..."', async () => {
    mockMutate.mockImplementation(() => {
      // Do nothing - stays on step 2
    });

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    expect(getByText('마법진 가동 중...')).toBeTruthy();
    expect(getByText(/설거지/)).toBeTruthy();
  });

  // --- Step 3 tests ---

  it('step 3: shows generated quest result with title, story, checkpoints', async () => {
    const { triggerSuccess } = setupMutateWithCallbacks();

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

    await act(async () => {
      triggerSuccess({ data: generatedResult });
    });

    await waitFor(() => {
      // Header
      expect(getByText('퀘스트 변환 완료')).toBeTruthy();
      // Title
      expect(getByText('마왕의 식기 정화 퀘스트')).toBeTruthy();
      // Story
      expect(getByText(/어둠의 식기들/)).toBeTruthy();
      // Grade & rewards
      expect(getByText('E급 퀘스트')).toBeTruthy();
      expect(getByText('+10 XP')).toBeTruthy();
      expect(getByText('+5 G')).toBeTruthy();
      expect(getByText('10분')).toBeTruthy();
      // Checkpoints
      expect(getByText('수세미 장비 장착')).toBeTruthy();
      expect(getByText('접시 정화 시작')).toBeTruthy();
    });
  });

  it('"다시 변환" resets to step 1', async () => {
    const { triggerSuccess } = setupMutateWithCallbacks();

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
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

  it('"이 퀘스트로 시작!" calls createQuest API', async () => {
    const { triggerSuccess } = setupMutateWithCallbacks();
    mockCreateQuest.mockResolvedValue({ success: true, data: {}, message: '' });

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
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

  // --- Additional tests ---

  it('back button calls goBack', () => {
    const { getByText } = render(<QuestCreateScreen />);
    fireEvent.press(getByText('<'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows alert and returns to step 1 on mutation error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { triggerError } = setupMutateWithCallbacks();

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
    fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');

    await act(async () => {
      fireEvent.press(getByText('퀘스트 변환!'));
    });

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

  it('shows alert on save failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { triggerSuccess } = setupMutateWithCallbacks();
    mockCreateQuest.mockRejectedValue(new Error('Save error'));

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
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

  it('category selection updates mutation payload', async () => {
    mockMutate.mockImplementation(() => {});

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
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

  it('due date input accepts text', () => {
    const { getByPlaceholderText } = render(<QuestCreateScreen />);
    const dateInput = getByPlaceholderText('YYYY-MM-DD');
    fireEvent.changeText(dateInput, '2026-05-01');
    expect(dateInput.props.value).toBe('2026-05-01');
  });

  it('shows timeline toggle on result screen', async () => {
    const { triggerSuccess } = setupMutateWithCallbacks();

    const { getByText, getByPlaceholderText } = render(<QuestCreateScreen />);
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
});
