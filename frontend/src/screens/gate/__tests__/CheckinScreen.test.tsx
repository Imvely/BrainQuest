import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CheckinScreen from '../CheckinScreen';
import { submitCheckin } from '../../../api/gate';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('../../../api/gate', () => ({
  submitCheckin: jest.fn(),
}));

const mockSubmit = submitCheckin as jest.MockedFunction<typeof submitCheckin>;

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function fillAndSubmitMorning(rendered: ReturnType<typeof render>) {
  const { getByText, getAllByText } = rendered;
  // sleepQuality: "좋음" is first occurrence
  const goodButtons = getAllByText('좋음');
  fireEvent.press(goodButtons[0]);
  // condition: "최고" is unique
  fireEvent.press(getByText('최고'));

  await act(async () => {
    fireEvent.press(getByText('체크인 완료'));
  });
}

async function fillAndSubmitEvening(rendered: ReturnType<typeof render>) {
  const { getByText, getAllByText } = rendered;
  // Each EmojiSelector section has 5 options; select "보통" (value=3) for all three
  const normalButtons = getAllByText('보통');
  fireEvent.press(normalButtons[0]); // focusScore
  fireEvent.press(normalButtons[1]); // impulsivityScore
  fireEvent.press(normalButtons[2]); // emotionScore

  await act(async () => {
    fireEvent.press(getByText('체크인 완료'));
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CheckinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. Renders correct header based on time of day
  // =========================================================================
  describe('morning rendering (hours < 14)', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders "아침 체크인" header', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText(/아침 체크인/)).toBeTruthy();
    });
  });

  describe('evening rendering (hours >= 14)', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('renders "저녁 체크인" header', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText(/저녁 체크인/)).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. Morning: shows sleep hours selector
  // =========================================================================
  describe('morning sleep hours selector', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows sleep hours section with default 7시간', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('수면 시간')).toBeTruthy();
      expect(getByText('7시간')).toBeTruthy();
    });

    it('increments sleep hours with + button', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('+'));
      expect(getByText('7.5시간')).toBeTruthy();
    });

    it('decrements sleep hours with - button', () => {
      const { getAllByText, getByText } = render(<CheckinScreen />);
      fireEvent.press(getAllByText('-')[0]);
      expect(getByText('6.5시간')).toBeTruthy();
    });

    it('clamps at minimum 4 hours', () => {
      const { getAllByText, getByText } = render(<CheckinScreen />);
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

  // =========================================================================
  // 3. Morning: shows sleep quality emoji selector
  // =========================================================================
  describe('morning sleep quality selector', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows sleep quality selector with 나쁨/보통/좋음 options', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      expect(getByText('수면의 질')).toBeTruthy();
      // "나쁨" appears in both sleep quality and condition sections
      expect(getAllByText('나쁨').length).toBeGreaterThanOrEqual(1);
      // "좋음" also appears in both sections
      expect(getAllByText('좋음').length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 4. Morning: shows condition selector (최악~최고)
  // =========================================================================
  describe('morning condition selector', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows condition selector with 최악/나쁨/보통/좋음/최고 options', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('현재 컨디션')).toBeTruthy();
      expect(getByText('최악')).toBeTruthy();
      expect(getByText('최고')).toBeTruthy();
    });
  });

  // =========================================================================
  // 5. Morning: submit disabled when fields incomplete
  // =========================================================================
  describe('morning validation', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('does not call API when no fields selected', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('does not call API with only sleepQuality selected', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      fireEvent.press(getAllByText('좋음')[0]); // sleepQuality only
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('does not call API with only condition selected', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('최고')); // condition only
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 6. Evening: shows focus, impulsivity, emotion selectors
  // =========================================================================
  describe('evening fields', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows focus, impulsivity, emotion selectors', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('오늘의 집중력')).toBeTruthy();
      expect(getByText('충동성 수준')).toBeTruthy();
      expect(getByText('감정 안정도')).toBeTruthy();
    });

    it('shows score options (매우 낮음 ~ 매우 높음)', () => {
      const { getAllByText } = render(<CheckinScreen />);
      // "매우 낮음" appears 3 times (once per selector)
      expect(getAllByText('매우 낮음')).toHaveLength(3);
      expect(getAllByText('매우 높음')).toHaveLength(3);
    });
  });

  // =========================================================================
  // 7. Evening: shows memo input
  // =========================================================================
  describe('evening memo input', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows memo input with placeholder', () => {
      const { getByPlaceholderText } = render(<CheckinScreen />);
      expect(getByPlaceholderText('오늘 하루 한마디...')).toBeTruthy();
    });
  });

  // =========================================================================
  // 8. Submit calls submitCheckin with correct payload
  // =========================================================================
  describe('morning submit', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('calls submitCheckin with morning payload', async () => {
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

  describe('evening submit', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('calls submitCheckin with evening payload', async () => {
      mockSubmit.mockResolvedValueOnce(EVENING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitEvening(rendered);

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

    it('does not call API when only some evening fields selected', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      const normalButtons = getAllByText('보통');
      fireEvent.press(normalButtons[0]); // only focus
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 9. On success: shows completion screen with streak count
  // =========================================================================
  describe('completion screen', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows streak count after successful morning checkin', async () => {
      mockSubmit.mockResolvedValueOnce(MORNING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      await waitFor(() => {
        expect(rendered.getByText('5일')).toBeTruthy();
        expect(rendered.getByText('연속 체크인')).toBeTruthy();
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

  // =========================================================================
  // 10. Completion screen shows EXP and Gold rewards
  // =========================================================================
  describe('reward display', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows EXP and Gold reward values', async () => {
      mockSubmit.mockResolvedValueOnce(MORNING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      await waitFor(() => {
        expect(rendered.getByText('+15')).toBeTruthy(); // exp
        expect(rendered.getByText('+10')).toBeTruthy(); // gold
        expect(rendered.getByText('EXP')).toBeTruthy();
        expect(rendered.getByText('Gold')).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // 11. "확인" button calls goBack
  // =========================================================================
  describe('navigation from completion', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('pressing "확인" button on completed screen calls goBack', async () => {
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

  // =========================================================================
  // Evening completion message
  // =========================================================================
  describe('evening completion', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(18);
    });
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows evening completion message "오늘도 수고했어요!"', async () => {
      mockSubmit.mockResolvedValueOnce(EVENING_SUCCESS as any);
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitEvening(rendered);

      await waitFor(() => {
        expect(rendered.getByText('오늘도 수고했어요!')).toBeTruthy();
      });
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================
  describe('error handling', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
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
      alertSpy.mockRestore();
    });

    it('does not transition to completed screen on error', async () => {
      mockSubmit.mockRejectedValueOnce(new Error('Server Error'));
      const rendered = render(<CheckinScreen />);
      await fillAndSubmitMorning(rendered);

      expect(rendered.queryByText('좋은 아침!')).toBeNull();
      expect(rendered.queryByText('✅')).toBeNull();
    });
  });

  // =========================================================================
  // Form navigation
  // =========================================================================
  describe('form navigation', () => {
    it('back button calls goBack', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
