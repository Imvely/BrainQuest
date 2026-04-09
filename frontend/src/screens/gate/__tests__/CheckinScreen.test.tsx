import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CheckinScreen from '../CheckinScreen';
import { submitCheckin } from '../../../api/gate';

// --- Mocks ---

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('../../../api/gate', () => ({
  submitCheckin: jest.fn(),
}));

const mockSubmit = submitCheckin as jest.MockedFunction<typeof submitCheckin>;

// --- Helpers ---

const MORNING_SUCCESS = {
  success: true,
  data: { id: 1, streakCount: 5, reward: { exp: 15, gold: 10 } },
  message: 'OK',
};

const EVENING_SUCCESS = {
  success: true,
  data: { id: 2, streakCount: 12, reward: { exp: 20, gold: 15 } },
  message: 'OK',
};

/**
 * Helper to complete the morning form and submit.
 * Selects sleepQuality="좋음" and condition="최고" then presses submit.
 */
async function fillAndSubmitMorning(rendered: ReturnType<typeof render>) {
  const { getByText, getAllByText } = rendered;
  // sleepQuality: "좋음" is the first occurrence among all "좋음" texts
  const goodButtons = getAllByText('좋음');
  fireEvent.press(goodButtons[0]);
  // condition: "최고" is unique
  fireEvent.press(getByText('최고'));

  await act(async () => {
    fireEvent.press(getByText('체크인 완료'));
  });
}

// --- Tests ---

describe('CheckinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== 1. Morning header based on time ==========
  describe('morning rendering (hours < 14)', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders morning header "아침 체크인"', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText(/아침 체크인/)).toBeTruthy();
    });

    it('shows morning-specific fields: sleep hours, sleep quality, condition', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('수면 시간')).toBeTruthy();
      expect(getByText('수면의 질')).toBeTruthy();
      expect(getByText('현재 컨디션')).toBeTruthy();
    });
  });

  // ========== 2. Evening header based on time ==========
  describe('evening rendering (hours >= 14)', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders evening header "저녁 체크인"', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText(/저녁 체크인/)).toBeTruthy();
    });

    it('shows evening-specific fields: focus, impulsivity, emotion, memo', () => {
      const { getByText, getByPlaceholderText } = render(<CheckinScreen />);
      expect(getByText('오늘의 집중력')).toBeTruthy();
      expect(getByText('충동성 수준')).toBeTruthy();
      expect(getByText('감정 안정도')).toBeTruthy();
      expect(getByPlaceholderText('오늘 하루 한마디...')).toBeTruthy();
    });
  });

  // ========== 3. Sleep hours stepper ==========
  describe('morning sleep hours stepper', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows default 7시간', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('7시간')).toBeTruthy();
    });

    it('increments sleep hours with + button', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('+'));
      expect(getByText('7.5시간')).toBeTruthy();
    });

    it('decrements sleep hours with - button', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      fireEvent.press(getAllByText('-')[0]);
      expect(getByText('6.5시간')).toBeTruthy();
    });

    it('clamps at minimum 4 hours', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      // Press - many times to go below 4
      for (let i = 0; i < 20; i++) {
        fireEvent.press(getAllByText('-')[0]);
      }
      expect(getByText('4시간')).toBeTruthy();
    });

    it('clamps at maximum 10 hours', () => {
      const { getByText } = render(<CheckinScreen />);
      for (let i = 0; i < 20; i++) {
        fireEvent.press(getByText('+'));
      }
      expect(getByText('10시간')).toBeTruthy();
    });
  });

  // ========== 4. Submit button disabled until required fields ==========
  describe('morning validation', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('submit button does not call API when required fields are not selected', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('submit button does not call API with only sleepQuality selected', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      fireEvent.press(getAllByText('좋음')[0]); // sleepQuality only
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('submit button does not call API with only condition selected', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('최고')); // condition only
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('evening validation', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('submit disabled when not all 3 evening scores are selected', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      // Select only focus (first "보통")
      const normalButtons = getAllByText('보통');
      fireEvent.press(normalButtons[0]);
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  // ========== 5. Submit button enabled after all fields selected ==========
  describe('morning submit enabled', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('calls submitCheckin API after selecting sleepQuality and condition', async () => {
      mockSubmit.mockResolvedValueOnce(MORNING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          checkinType: 'MORNING',
          sleepQuality: 3,
          condition: 5,
          sleepHours: 7,
        }),
      );
    });
  });

  describe('evening submit enabled', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('calls submitCheckin API after selecting all 3 evening scores', async () => {
      mockSubmit.mockResolvedValueOnce(EVENING_SUCCESS as any);
      const { getByText, getAllByText } = render(<CheckinScreen />);

      // Each score section has 5 options labeled: 매우 낮음, 낮음, 보통, 높음, 매우 높음
      // Select "보통" (value=3) for focus, impulsivity, emotion
      const normalButtons = getAllByText('보통');
      fireEvent.press(normalButtons[0]); // focusScore
      fireEvent.press(normalButtons[1]); // impulsivityScore
      fireEvent.press(normalButtons[2]); // emotionScore

      await act(async () => {
        fireEvent.press(getByText('체크인 완료'));
      });

      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          checkinType: 'EVENING',
          focusScore: 3,
          impulsivityScore: 3,
          emotionScore: 3,
        }),
      );
    });
  });

  // ========== 6. Successful submit shows completed screen ==========
  describe('successful submit shows completed screen', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows completed state with streak count and rewards', async () => {
      mockSubmit.mockResolvedValueOnce(MORNING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      await waitFor(() => {
        expect(rendered.getByText('5일')).toBeTruthy();
        expect(rendered.getByText('+15')).toBeTruthy(); // exp
        expect(rendered.getByText('+10')).toBeTruthy(); // gold
        expect(rendered.getByText('EXP')).toBeTruthy();
        expect(rendered.getByText('Gold')).toBeTruthy();
      });
    });

    it('shows morning completion message "좋은 아침!"', async () => {
      mockSubmit.mockResolvedValueOnce(MORNING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      await waitFor(() => {
        expect(rendered.getByText('좋은 아침!')).toBeTruthy();
        expect(rendered.getByText('체크인 완료')).toBeTruthy();
      });
    });

    it('shows checkmark emoji on completion', async () => {
      mockSubmit.mockResolvedValueOnce(MORNING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      await waitFor(() => {
        expect(rendered.getByText('✅')).toBeTruthy();
      });
    });
  });

  describe('evening completion message', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows evening completion message "오늘도 수고했어요!"', async () => {
      mockSubmit.mockResolvedValueOnce(EVENING_SUCCESS as any);
      const { getByText, getAllByText } = render(<CheckinScreen />);

      const normalButtons = getAllByText('보통');
      fireEvent.press(normalButtons[0]);
      fireEvent.press(normalButtons[1]);
      fireEvent.press(normalButtons[2]);

      await act(async () => {
        fireEvent.press(getByText('체크인 완료'));
      });

      await waitFor(() => {
        expect(getByText('오늘도 수고했어요!')).toBeTruthy();
      });
    });
  });

  // ========== 7. Error shows alert ==========
  describe('error handling', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows alert on API failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockSubmit.mockRejectedValueOnce(new Error('Network Error'));
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      expect(alertSpy).toHaveBeenCalledWith('체크인 실패', '잠시 후 다시 시도해주세요.');
    });

    it('does not transition to completed screen on error', async () => {
      mockSubmit.mockRejectedValueOnce(new Error('Server Error'));
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      expect(rendered.queryByText('좋은 아침!')).toBeNull();
      expect(rendered.queryByText('✅')).toBeNull();
    });
  });

  // ========== 8. Completed screen 확인 button calls goBack ==========
  describe('completed screen navigation', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(10);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('pressing 확인 button on completed screen calls goBack', async () => {
      mockSubmit.mockResolvedValueOnce(MORNING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      await waitFor(() => {
        expect(rendered.getByText('확인')).toBeTruthy();
      });

      fireEvent.press(rendered.getByText('확인'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  // ========== Additional: back button on form ==========
  describe('form navigation', () => {
    it('back button calls goBack', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
