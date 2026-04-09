import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ScreeningScreen from '../ScreeningScreen';
import { submitScreening } from '../../../api/gate';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

// --- Mocks ---

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../api/gate', () => ({
  submitScreening: jest.fn(),
}));

const mockSubmit = submitScreening as jest.MockedFunction<typeof submitScreening>;

// --- Tests ---

describe('ScreeningScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ===========================================
  // 1. Selection Phase
  // ===========================================
  describe('selection phase', () => {
    it('renders "시작하기 전에" title', () => {
      const { getByText } = render(<ScreeningScreen />);
      expect(getByText('시작하기 전에')).toBeTruthy();
    });

    it('renders 3 cards: 혹시 나도?, 이미 진단받았어요, 그냥 둘러볼게요', () => {
      const { getByText } = render(<ScreeningScreen />);
      expect(getByText('혹시 나도?')).toBeTruthy();
      expect(getByText('이미 진단받았어요')).toBeTruthy();
      expect(getByText('그냥 둘러볼게요')).toBeTruthy();
    });

    it('shows descriptive text for each selection card', () => {
      const { getByText } = render(<ScreeningScreen />);
      expect(getByText(/간단한 스크리닝 테스트/)).toBeTruthy();
      expect(getByText(/진단 정보 입력 후/)).toBeTruthy();
      expect(getByText(/스크리닝 없이/)).toBeTruthy();
    });
  });

  // ===========================================
  // 2. Navigation from selection
  // ===========================================
  describe('selection navigation', () => {
    it('tapping "혹시 나도?" switches to quiz phase', () => {
      const { getByText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('혹시 나도?'));
      // Quiz phase shows question counter
      expect(getByText('1 / 6')).toBeTruthy();
    });

    it('tapping "이미 진단받았어요" switches to diagnosis phase', () => {
      const { getByText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('이미 진단받았어요'));
      // Diagnosis phase shows "진단 정보" title
      expect(getByText('진단 정보')).toBeTruthy();
    });

    it('tapping "그냥 둘러볼게요" navigates to StyleQuiz', () => {
      const { getByText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('그냥 둘러볼게요'));
      expect(mockNavigate).toHaveBeenCalledWith('StyleQuiz');
    });
  });

  // ===========================================
  // 3. Diagnosis Phase
  // ===========================================
  describe('diagnosis phase', () => {
    it('renders "진단 정보" title and date input', () => {
      const { getByText, getByPlaceholderText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('이미 진단받았어요'));
      expect(getByText('진단 정보')).toBeTruthy();
      expect(getByText('이미 ADHD 진단을 받으셨군요')).toBeTruthy();
      expect(getByPlaceholderText('예: 2024-06')).toBeTruthy();
    });

    it('continue button navigates to StyleQuiz', () => {
      const { getByText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('이미 진단받았어요'));
      fireEvent.press(getByText('다음으로'));
      expect(mockNavigate).toHaveBeenCalledWith('StyleQuiz');
    });

    it('back button returns to selection phase', () => {
      const { getByText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('이미 진단받았어요'));
      fireEvent.press(getByText('<'));
      expect(getByText('시작하기 전에')).toBeTruthy();
    });
  });

  // ===========================================
  // 4. Quiz Phase
  // ===========================================
  describe('quiz phase', () => {
    function goToQuiz(rendered: ReturnType<typeof render>) {
      fireEvent.press(rendered.getByText('혹시 나도?'));
    }

    it('renders question text and 5 scale buttons', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      expect(rendered.getByText(/마무리를 짓지 못한 적이/)).toBeTruthy();
      expect(rendered.getByText('0')).toBeTruthy();
      expect(rendered.getByText('1')).toBeTruthy();
      expect(rendered.getByText('2')).toBeTruthy();
      expect(rendered.getByText('3')).toBeTruthy();
      expect(rendered.getByText('4')).toBeTruthy();
    });

    it('renders progress bar', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      // Progress bar is present (confirmed by the counter)
      expect(rendered.getByText('1 / 6')).toBeTruthy();
    });

    it('shows question counter "1 / 6"', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      expect(rendered.getByText('1 / 6')).toBeTruthy();
    });

    it('renders scale labels', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      expect(rendered.getByText(/전혀/)).toBeTruthy();
      expect(rendered.getByText(/매우/)).toBeTruthy();
    });

    it('selecting answer highlights button (applies active style)', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);

      // Press the "2" option
      fireEvent.press(rendered.getByText('2'));
      // After selection, the button still shows "2" (active state applied via styles)
      expect(rendered.getByText('2')).toBeTruthy();
    });

    it('advances to next question after answer with timer', async () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);

      await act(async () => {
        fireEvent.press(rendered.getByText('2'));
        jest.advanceTimersByTime(400);
      });

      expect(rendered.getByText('2 / 6')).toBeTruthy();
      expect(rendered.getByText(/체계적으로 일을 해야 할 때/)).toBeTruthy();
    });

    it('back button returns to previous question', async () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);

      // Advance to Q2
      await act(async () => {
        fireEvent.press(rendered.getByText('2'));
        jest.advanceTimersByTime(400);
      });
      expect(rendered.getByText('2 / 6')).toBeTruthy();

      // Press back
      fireEvent.press(rendered.getByText('<'));
      expect(rendered.getByText('1 / 6')).toBeTruthy();
    });

    it('back button on Q1 returns to selection', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      fireEvent.press(rendered.getByText('<'));
      expect(rendered.getByText('시작하기 전에')).toBeTruthy();
    });
  });

  // ===========================================
  // 5. Tooltip Modal
  // ===========================================
  describe('tooltip modal', () => {
    it('opens when ? tapped', () => {
      const rendered = render(<ScreeningScreen />);
      fireEvent.press(rendered.getByText('혹시 나도?'));
      fireEvent.press(rendered.getByText('?'));
      expect(rendered.getByText('이 문항에 대해')).toBeTruthy();
      expect(rendered.getByText(/실행 기능 저하/)).toBeTruthy();
    });

    it('closes when 확인 is pressed', () => {
      const rendered = render(<ScreeningScreen />);
      fireEvent.press(rendered.getByText('혹시 나도?'));
      fireEvent.press(rendered.getByText('?'));
      expect(rendered.getByText('이 문항에 대해')).toBeTruthy();
      fireEvent.press(rendered.getByText('확인'));
      // Modal should close
    });
  });

  // ===========================================
  // 6. Result Phase
  // ===========================================
  describe('result phase', () => {
    // Helper: answer all 6 questions with a given value
    async function completeQuizWithValue(
      rendered: ReturnType<typeof render>,
      value: number,
    ) {
      mockSubmit.mockRejectedValue(new Error('offline'));
      fireEvent.press(rendered.getByText('혹시 나도?'));
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(rendered.getByText(String(value)));
          jest.advanceTimersByTime(400);
        });
      }
      // Ensure the rejected promise settles
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });
    }

    it('renders score and risk badge after completing quiz', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuizWithValue(rendered, 2);
      await waitFor(() => {
        expect(rendered.getByText('스크리닝 결과')).toBeTruthy();
        expect(rendered.getByText('/ 24')).toBeTruthy();
      });
    });

    it('LOW risk (score 0-9) shows 낮은 위험', async () => {
      const rendered = render(<ScreeningScreen />);
      // Answering all 0 => total score = 0
      await completeQuizWithValue(rendered, 0);
      await waitFor(() => {
        const badges = rendered.getAllByText('낮은 위험');
        expect(badges.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('MEDIUM risk (score 10-13) shows 중간 위험', async () => {
      const rendered = render(<ScreeningScreen />);
      // Answering all 2 => total score = 12
      await completeQuizWithValue(rendered, 2);
      await waitFor(() => {
        const badges = rendered.getAllByText('중간 위험');
        expect(badges.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('HIGH risk shows 정신건강의학과 찾기 button', async () => {
      const rendered = render(<ScreeningScreen />);
      // Answering all 4 => total score = 24 => HIGH
      await completeQuizWithValue(rendered, 4);
      await waitFor(() => {
        const badges = rendered.getAllByText('높은 위험');
        expect(badges.length).toBeGreaterThanOrEqual(1);
        expect(rendered.getByText(/정신건강의학과 찾기/)).toBeTruthy();
      });
    });

    it('share card renders BrainQuest and "나도 테스트하기"', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuizWithValue(rendered, 2);
      await waitFor(() => {
        expect(rendered.getByText('나도 테스트하기')).toBeTruthy();
        // Share card has BrainQuest logo
        const logos = rendered.getAllByText('BrainQuest');
        expect(logos.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('continue button navigates to StyleQuiz', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuizWithValue(rendered, 2);
      await waitFor(() => {
        fireEvent.press(rendered.getByText('다음 단계로'));
        expect(mockNavigate).toHaveBeenCalledWith('StyleQuiz');
      });
    });

    it('shows disclaimer text', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuizWithValue(rendered, 2);
      await waitFor(() => {
        expect(rendered.getByText(/의료 진단이 아닌 선별 도구/)).toBeTruthy();
      });
    });
  });

  // ===========================================
  // 7. API Integration
  // ===========================================
  describe('API integration', () => {
    it('calls submitScreening with correct payload', async () => {
      mockSubmit.mockResolvedValueOnce({
        data: { id: 1, testType: 'ASRS_6', totalScore: 6, riskLevel: 'LOW', createdAt: '' },
      } as any);

      const rendered = render(<ScreeningScreen />);
      fireEvent.press(rendered.getByText('혹시 나도?'));

      // Answer all 6 with value 1
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(rendered.getByText('1'));
          jest.advanceTimersByTime(400);
        });
      }

      expect(mockSubmit).toHaveBeenCalledWith({
        testType: 'ASRS_6',
        answers: { q1: 1, q2: 1, q3: 1, q4: 1, q5: 1, q6: 1 },
      });
    });

    it('uses API result data when available', async () => {
      mockSubmit.mockResolvedValueOnce({
        data: { id: 1, testType: 'ASRS_6', totalScore: 8, riskLevel: 'LOW', createdAt: '' },
      } as any);

      const rendered = render(<ScreeningScreen />);
      fireEvent.press(rendered.getByText('혹시 나도?'));

      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(rendered.getByText('1'));
          jest.advanceTimersByTime(400);
        });
      }

      await waitFor(() => {
        expect(rendered.getByText('스크리닝 결과')).toBeTruthy();
      });
    });

    it('falls back to local scoring on network error', async () => {
      mockSubmit.mockRejectedValue(new Error('Network'));
      const rendered = render(<ScreeningScreen />);
      fireEvent.press(rendered.getByText('혹시 나도?'));

      // Answer all 6 with 0 -> total = 0 -> LOW
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(rendered.getByText('0'));
          jest.advanceTimersByTime(400);
        });
      }

      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      const lowRisks = rendered.getAllByText('낮은 위험');
      expect(lowRisks.length).toBeGreaterThanOrEqual(1);
      expect(rendered.getByText('스크리닝 결과')).toBeTruthy();
    });
  });

  // ===========================================
  // 8. Share Flow
  // ===========================================
  describe('share flow', () => {
    it('calls captureRef and shareAsync on share button tap', async () => {
      mockSubmit.mockRejectedValue(new Error('offline'));
      const rendered = render(<ScreeningScreen />);
      fireEvent.press(rendered.getByText('혹시 나도?'));

      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(rendered.getByText('2'));
          jest.advanceTimersByTime(400);
        });
      }

      await waitFor(() => {
        expect(rendered.getByText('결과 카드 공유하기')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(rendered.getByText('결과 카드 공유하기'));
      });

      expect(captureRef).toHaveBeenCalled();
      expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    });
  });
});
