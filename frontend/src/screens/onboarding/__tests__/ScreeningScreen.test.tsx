import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ScreeningScreen from '../ScreeningScreen';
import { submitScreening } from '../../../api/gate';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../api/gate', () => ({
  submitScreening: jest.fn(),
}));

const mockSubmit = submitScreening as jest.MockedFunction<typeof submitScreening>;

describe('ScreeningScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // --- 1. Selection Phase Rendering ---
  describe('selection phase', () => {
    it('renders selection title and subtitle', () => {
      const { getByText } = render(<ScreeningScreen />);
      expect(getByText('시작하기 전에')).toBeTruthy();
      expect(getByText('나에 대해 알려주세요')).toBeTruthy();
    });

    it('shows three entry options', () => {
      const { getByText } = render(<ScreeningScreen />);
      expect(getByText('혹시 나도?')).toBeTruthy();
      expect(getByText('이미 진단받았어요')).toBeTruthy();
      expect(getByText('그냥 둘러볼게요')).toBeTruthy();
    });

    it('shows descriptive text for each option', () => {
      const { getByText } = render(<ScreeningScreen />);
      expect(getByText(/간단한 스크리닝 테스트/)).toBeTruthy();
      expect(getByText(/바로 캐릭터 스타일/)).toBeTruthy();
      expect(getByText(/스크리닝 없이/)).toBeTruthy();
    });
  });

  // --- 2. Navigation from selection ---
  describe('selection navigation', () => {
    it('transitions to quiz on "혹시 나도?" tap', () => {
      const { getByText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('혹시 나도?'));
      expect(getByText('1 / 6')).toBeTruthy();
    });

    it('navigates to StyleQuiz on "이미 진단받았어요" tap', () => {
      const { getByText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('이미 진단받았어요'));
      expect(mockNavigate).toHaveBeenCalledWith('StyleQuiz');
    });

    it('navigates to StyleQuiz on "그냥 둘러볼게요" tap', () => {
      const { getByText } = render(<ScreeningScreen />);
      fireEvent.press(getByText('그냥 둘러볼게요'));
      expect(mockNavigate).toHaveBeenCalledWith('StyleQuiz');
    });
  });

  // --- 3. Quiz Phase ---
  describe('quiz phase', () => {
    function goToQuiz(rendered: ReturnType<typeof render>) {
      fireEvent.press(rendered.getByText('혹시 나도?'));
    }

    it('displays first ASRS question', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      expect(rendered.getByText(/마무리를 짓지 못한 적이/)).toBeTruthy();
    });

    it('shows 5 scale options (0-4)', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      expect(rendered.getByText('0')).toBeTruthy();
      expect(rendered.getByText('1')).toBeTruthy();
      expect(rendered.getByText('2')).toBeTruthy();
      expect(rendered.getByText('3')).toBeTruthy();
      expect(rendered.getByText('4')).toBeTruthy();
    });

    it('shows progress bar', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      expect(rendered.getByText('1 / 6')).toBeTruthy();
    });

    it('shows tooltip button', () => {
      const rendered = render(<ScreeningScreen />);
      goToQuiz(rendered);
      expect(rendered.getByText('?')).toBeTruthy();
    });

    it('advances to next question after answer (with timer)', async () => {
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

  // --- 4. Tooltip modal ---
  describe('tooltip', () => {
    it('opens tooltip modal when ? is pressed', () => {
      const rendered = render(<ScreeningScreen />);
      fireEvent.press(rendered.getByText('혹시 나도?'));
      fireEvent.press(rendered.getByText('?'));
      expect(rendered.getByText('이 문항에 대해')).toBeTruthy();
      expect(rendered.getByText(/실행 기능 저하/)).toBeTruthy();
    });

    it('closes tooltip modal when 확인 is pressed', () => {
      const rendered = render(<ScreeningScreen />);
      fireEvent.press(rendered.getByText('혹시 나도?'));
      fireEvent.press(rendered.getByText('?'));
      fireEvent.press(rendered.getByText('확인'));
      // Modal should close (no longer showing tooltip title prominently)
    });
  });

  // --- 5. Result Phase ---
  describe('result phase', () => {
    async function completeQuiz(rendered: ReturnType<typeof render>) {
      mockSubmit.mockRejectedValue(new Error('offline'));
      fireEvent.press(rendered.getByText('혹시 나도?'));
      for (let i = 0; i < 6; i++) {
        await act(async () => {
          fireEvent.press(rendered.getByText('2'));
          jest.advanceTimersByTime(400);
        });
      }
    }

    it('shows result screen after completing all 6 questions', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuiz(rendered);
      await waitFor(() => {
        expect(rendered.getByText('스크리닝 결과')).toBeTruthy();
      });
    });

    it('displays score with /24 max', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuiz(rendered);
      await waitFor(() => {
        expect(rendered.getByText('/ 24')).toBeTruthy();
      });
    });

    it('shows risk level badge', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuiz(rendered);
      await waitFor(() => {
        // score 12 = MEDIUM; appears in result badge + share card
        const badges = rendered.getAllByText('중간 위험');
        expect(badges.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows disclaimer text', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuiz(rendered);
      await waitFor(() => {
        expect(rendered.getByText(/의료 진단이 아닌 선별 도구/)).toBeTruthy();
      });
    });

    it('shows share card with CTA', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuiz(rendered);
      await waitFor(() => {
        expect(rendered.getByText('나도 테스트하기')).toBeTruthy();
        expect(rendered.getByText('결과 카드 공유하기')).toBeTruthy();
      });
    });

    it('navigate to StyleQuiz on "다음 단계로" tap', async () => {
      const rendered = render(<ScreeningScreen />);
      await completeQuiz(rendered);
      await waitFor(() => {
        fireEvent.press(rendered.getByText('다음 단계로'));
        expect(mockNavigate).toHaveBeenCalledWith('StyleQuiz');
      });
    });
  });

  // --- 6. API integration ---
  describe('API integration', () => {
    it('calls submitScreening with correct payload', async () => {
      mockSubmit.mockResolvedValueOnce({
        data: { id: 1, testType: 'ASRS_6', totalScore: 8, riskLevel: 'LOW', createdAt: '' },
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

      // Wait for promise rejection + state update
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      });

      // "낮은 위험" appears in both result badge and share card
      const lowRisks = rendered.getAllByText('낮은 위험');
      expect(lowRisks.length).toBeGreaterThanOrEqual(1);
      expect(rendered.getByText('스크리닝 결과')).toBeTruthy();
    });
  });

  // --- 7. Share flow ---
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
