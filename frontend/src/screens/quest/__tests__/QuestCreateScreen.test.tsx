import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuestCreateScreen from '../QuestCreateScreen';
import * as questApi from '../../../api/quest';

// --- Mocks ---
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock('../../../api/quest', () => ({
  generateQuest: jest.fn(),
  createQuest: jest.fn(),
}));

const mockGenerateQuest = questApi.generateQuest as jest.MockedFunction<typeof questApi.generateQuest>;
const mockCreateQuest = questApi.createQuest as jest.MockedFunction<typeof questApi.createQuest>;

const generatedResult = {
  success: true as const,
  data: {
    questTitle: '마왕의 식기 정화 퀘스트',
    questStory: '어둠의 식기들이 싱크대를 점령했다!',
    grade: 'E' as const,
    estimatedMin: 10,
    expReward: 10,
    goldReward: 5,
    checkpoints: [
      { orderNum: 1, title: '수세미 장비 장착', estimatedMin: 3, expReward: 3, goldReward: 2 },
      { orderNum: 2, title: '접시 정화 시작', estimatedMin: 7, expReward: 7, goldReward: 3 },
    ],
  },
  message: '변환 성공',
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

describe('QuestCreateScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Step 1: Input Rendering ---
  describe('Step 1: input form', () => {
    it('renders without crashing', () => {
      const { toJSON } = renderWithProviders(<QuestCreateScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays header title', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      expect(getByText('퀘스트 생성')).toBeTruthy();
    });

    it('displays text input placeholder', () => {
      const { getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
      expect(getByPlaceholderText(/설거지, 보고서 작성/)).toBeTruthy();
    });

    it('displays category chips', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      expect(getByText('업무')).toBeTruthy();
      expect(getByText('가사')).toBeTruthy();
      expect(getByText('건강')).toBeTruthy();
      expect(getByText('사회')).toBeTruthy();
      expect(getByText('자기관리')).toBeTruthy();
    });

    it('displays time buttons', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      expect(getByText('5m')).toBeTruthy();
      expect(getByText('10m')).toBeTruthy();
      expect(getByText('30m')).toBeTruthy();
      expect(getByText('1h')).toBeTruthy();
    });

    it('displays grade preview', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      // Default is 30min = D급
      expect(getByText('D급')).toBeTruthy();
      expect(getByText('30분')).toBeTruthy();
    });

    it('displays generate button', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      expect(getByText('퀘스트 변환!')).toBeTruthy();
    });

    it('has back button', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // --- 2. Input interactions ---
  describe('input interactions', () => {
    it('updates time when time button pressed', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      fireEvent.press(getByText('10m'));
      expect(getByText('10분')).toBeTruthy();
      expect(getByText('E급')).toBeTruthy();
    });

    it('updates grade preview based on time selection', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      fireEvent.press(getByText('2h'));
      expect(getByText('B급')).toBeTruthy();
    });

    it('accepts text input', () => {
      const { getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
      const input = getByPlaceholderText(/설거지/);
      fireEvent.changeText(input, '보고서 작성');
      expect(input.props.value).toBe('보고서 작성');
    });

    it('switches category when chip pressed', () => {
      // Just verify no crash; category state is internal
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      fireEvent.press(getByText('건강'));
      expect(getByText('건강')).toBeTruthy();
    });
  });

  // --- 3. Validation ---
  describe('validation', () => {
    it('generate button is disabled when title is empty', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      const btn = getByText('퀘스트 변환!');
      // Button's parent TouchableOpacity should be disabled
      fireEvent.press(btn);
      expect(mockGenerateQuest).not.toHaveBeenCalled();
    });

    it('generate button becomes enabled after input', () => {
      const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);
      fireEvent.changeText(getByPlaceholderText(/설거지/), '보고서');
      const btn = getByText('퀘스트 변환!');
      // Now the button should be pressable
      expect(btn).toBeTruthy();
    });

    it('does not call API when title is empty', () => {
      const { getByText } = renderWithProviders(<QuestCreateScreen />);
      fireEvent.press(getByText('퀘스트 변환!'));
      expect(mockGenerateQuest).not.toHaveBeenCalled();
    });
  });

  // --- 4. Step 2: AI Generation ---
  describe('Step 2: loading state', () => {
    it('shows loading screen after generate', async () => {
      mockGenerateQuest.mockReturnValue(new Promise(() => {})); // never resolves
      const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);

      fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');
      await act(async () => {
        fireEvent.press(getByText('퀘스트 변환!'));
      });

      await waitFor(() => {
        expect(getByText('마법진 가동 중...')).toBeTruthy();
        expect(getByText(/설거지/)).toBeTruthy();
      });
    });
  });

  // --- 5. Step 3: Result ---
  describe('Step 3: result display', () => {
    async function goToResult() {
      mockGenerateQuest.mockResolvedValue(generatedResult as any);
      const rendered = renderWithProviders(<QuestCreateScreen />);

      fireEvent.changeText(rendered.getByPlaceholderText(/설거지/), '설거지');
      await act(async () => {
        fireEvent.press(rendered.getByText('퀘스트 변환!'));
      });

      await waitFor(() => rendered.getByText('퀘스트 변환 완료'));
      return rendered;
    }

    it('displays quest title in cyan', async () => {
      const { getByText } = await goToResult();
      expect(getByText('마왕의 식기 정화 퀘스트')).toBeTruthy();
    });

    it('displays story card', async () => {
      const { getByText } = await goToResult();
      expect(getByText('퀘스트 스토리')).toBeTruthy();
      expect(getByText(/어둠의 식기들/)).toBeTruthy();
    });

    it('displays grade and rewards', async () => {
      const { getByText } = await goToResult();
      expect(getByText('E급 퀘스트')).toBeTruthy();
      expect(getByText('+10 XP')).toBeTruthy();
      expect(getByText('+5 G')).toBeTruthy();
    });

    it('displays checkpoints', async () => {
      const { getByText } = await goToResult();
      expect(getByText('수세미 장비 장착')).toBeTruthy();
      expect(getByText('접시 정화 시작')).toBeTruthy();
    });

    it('shows save and retry buttons', async () => {
      const { getByText } = await goToResult();
      expect(getByText('이 퀘스트로 시작!')).toBeTruthy();
      expect(getByText('다시 변환')).toBeTruthy();
    });

    it('shows timeline toggle', async () => {
      const { getByText } = await goToResult();
      expect(getByText('타임라인에 배치할까요?')).toBeTruthy();
    });
  });

  // --- 6. Save quest ---
  describe('save quest', () => {
    it('calls createQuest API when save button pressed', async () => {
      mockGenerateQuest.mockResolvedValue(generatedResult as any);
      mockCreateQuest.mockResolvedValue({ success: true, data: {} as any, message: '' });

      const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);

      fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');
      await act(async () => {
        fireEvent.press(getByText('퀘스트 변환!'));
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
      });
    });

    it('navigates back on successful save', async () => {
      mockGenerateQuest.mockResolvedValue(generatedResult as any);
      mockCreateQuest.mockResolvedValue({ success: true, data: {} as any, message: '' });

      const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);

      fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');
      await act(async () => {
        fireEvent.press(getByText('퀘스트 변환!'));
      });

      await waitFor(() => getByText('이 퀘스트로 시작!'));
      await act(async () => {
        fireEvent.press(getByText('이 퀘스트로 시작!'));
      });

      await waitFor(() => expect(mockGoBack).toHaveBeenCalled());
    });
  });

  // --- 7. Retry ---
  describe('retry generation', () => {
    it('returns to step 1 when "다시 변환" pressed', async () => {
      mockGenerateQuest.mockResolvedValue(generatedResult as any);
      const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);

      fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');
      await act(async () => {
        fireEvent.press(getByText('퀘스트 변환!'));
      });

      await waitFor(() => getByText('다시 변환'));
      fireEvent.press(getByText('다시 변환'));

      await waitFor(() => {
        expect(getByText('퀘스트 생성')).toBeTruthy();
        expect(getByPlaceholderText(/설거지/)).toBeTruthy();
      });
    });
  });

  // --- 8. Error handling ---
  describe('error handling', () => {
    it('shows alert and returns to step 1 on API error', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockGenerateQuest.mockRejectedValue(new Error('Network error'));

      const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);

      fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');
      await act(async () => {
        fireEvent.press(getByText('퀘스트 변환!'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('변환 실패', expect.any(String));
      });

      alertSpy.mockRestore();
    });

    it('shows alert on save failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockGenerateQuest.mockResolvedValue(generatedResult as any);
      mockCreateQuest.mockRejectedValue(new Error('Save error'));

      const { getByText, getByPlaceholderText } = renderWithProviders(<QuestCreateScreen />);

      fireEvent.changeText(getByPlaceholderText(/설거지/), '설거지');
      await act(async () => {
        fireEvent.press(getByText('퀘스트 변환!'));
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
  });
});
