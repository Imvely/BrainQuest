import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import CheckinScreen from '../CheckinScreen';
import { submitCheckin } from '../../../api/gate';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('../../../api/gate', () => ({
  submitCheckin: jest.fn(),
}));

const mockSubmit = submitCheckin as jest.MockedFunction<typeof submitCheckin>;

describe('CheckinScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Rendering ---
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<CheckinScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays time-based header', () => {
      const { getByText } = render(<CheckinScreen />);
      const hour = new Date().getHours();
      if (hour < 14) {
        expect(getByText(/아침 체크인/)).toBeTruthy();
      } else {
        expect(getByText(/저녁 체크인/)).toBeTruthy();
      }
    });

    it('shows submit button', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('체크인 완료')).toBeTruthy();
    });

    it('shows back button', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('<')).toBeTruthy();
    });
  });

  // --- 2. Morning-specific fields ---
  describe('morning form', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows sleep hours field with default 7', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('수면 시간')).toBeTruthy();
      expect(getByText('7시간')).toBeTruthy();
    });

    it('adjusts sleep hours with +/- buttons', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('+'));
      expect(getByText('7.5시간')).toBeTruthy();
      fireEvent.press(getAllByText('-')[0]);
      expect(getByText('7시간')).toBeTruthy();
    });

    it('clamps sleep hours at 4 minimum', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      for (let i = 0; i < 20; i++) fireEvent.press(getAllByText('-')[0]);
      expect(getByText('4시간')).toBeTruthy();
    });

    it('clamps sleep hours at 10 maximum', () => {
      const { getByText } = render(<CheckinScreen />);
      for (let i = 0; i < 20; i++) fireEvent.press(getByText('+'));
      expect(getByText('10시간')).toBeTruthy();
    });

    it('shows sleep quality and condition labels', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('수면의 질')).toBeTruthy();
      expect(getByText('현재 컨디션')).toBeTruthy();
    });

    it('shows condition options including 최악 and 최고', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('최악')).toBeTruthy();
      expect(getByText('최고')).toBeTruthy();
    });

    it('submit button does nothing without required fields', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it('calls API after selecting sleep quality and condition', async () => {
      mockSubmit.mockResolvedValueOnce({
        data: { id: 1, streakCount: 3, reward: { exp: 10, gold: 10 } },
      } as any);
      const { getByText, getAllByText } = render(<CheckinScreen />);

      // Select sleep quality: "좋음" (3rd in sleep quality = index 2 of all "좋음")
      const goodButtons = getAllByText('좋음');
      fireEvent.press(goodButtons[0]); // sleep quality 좋음

      // Select condition: "최고" (unique)
      fireEvent.press(getByText('최고'));

      await act(async () => {
        fireEvent.press(getByText('체크인 완료'));
      });

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

  // --- 3. Evening-specific fields ---
  describe('evening form', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(20);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('shows focus/impulsivity/emotion selectors', () => {
      const { getByText } = render(<CheckinScreen />);
      expect(getByText('오늘의 집중력')).toBeTruthy();
      expect(getByText('충동성 수준')).toBeTruthy();
      expect(getByText('감정 안정도')).toBeTruthy();
    });

    it('shows memo input', () => {
      const { getByPlaceholderText } = render(<CheckinScreen />);
      expect(getByPlaceholderText('오늘 하루 한마디...')).toBeTruthy();
    });

    it('submit disabled without all 3 scores selected', () => {
      const { getByText, getAllByText } = render(<CheckinScreen />);
      // Only select one score
      const normalButtons = getAllByText('보통');
      fireEvent.press(normalButtons[0]);
      fireEvent.press(getByText('체크인 완료'));
      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  // --- 4. Completion state ---
  describe('completion', () => {
    beforeEach(() => {
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    async function submitMorningCheckin(rendered: ReturnType<typeof render>) {
      mockSubmit.mockResolvedValueOnce({
        data: { id: 1, streakCount: 7, reward: { exp: 10, gold: 10 } },
      } as any);
      const { getByText, getAllByText } = rendered;
      fireEvent.press(getAllByText('좋음')[0]); // sleep quality
      fireEvent.press(getByText('최고'));        // condition
      await act(async () => {
        fireEvent.press(getByText('체크인 완료'));
      });
    }

    it('shows completion screen with streak count', async () => {
      const rendered = render(<CheckinScreen />);
      await submitMorningCheckin(rendered);

      await waitFor(() => {
        expect(rendered.getByText('7일')).toBeTruthy();
        expect(rendered.getByText('EXP')).toBeTruthy();
        expect(rendered.getByText('Gold')).toBeTruthy();
      });
    });

    it('shows morning-specific completion message', async () => {
      const rendered = render(<CheckinScreen />);
      await submitMorningCheckin(rendered);

      await waitFor(() => {
        expect(rendered.getByText('좋은 아침!')).toBeTruthy();
        expect(rendered.getByText('체크인 완료')).toBeTruthy();
      });
    });

    it('navigates back on 확인 button', async () => {
      const rendered = render(<CheckinScreen />);
      await submitMorningCheckin(rendered);

      await waitFor(() => {
        fireEvent.press(rendered.getByText('확인'));
        expect(mockGoBack).toHaveBeenCalled();
      });
    });

    it('displays reward amounts', async () => {
      const rendered = render(<CheckinScreen />);
      await submitMorningCheckin(rendered);

      await waitFor(() => {
        // +10 appears for both EXP and Gold
        const rewards = rendered.getAllByText('+10');
        expect(rewards.length).toBe(2);
      });
    });
  });

  // --- 5. Error handling ---
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
      const { getByText, getAllByText } = render(<CheckinScreen />);
      fireEvent.press(getAllByText('좋음')[0]);
      fireEvent.press(getByText('최고'));

      await act(async () => {
        fireEvent.press(getByText('체크인 완료'));
      });

      expect(alertSpy).toHaveBeenCalledWith('체크인 실패', '잠시 후 다시 시도해주세요.');
    });

    it('does not show completion screen on failure', async () => {
      mockSubmit.mockRejectedValueOnce(new Error('Failure'));
      const { getByText, getAllByText, queryByText } = render(<CheckinScreen />);
      fireEvent.press(getAllByText('좋음')[0]);
      fireEvent.press(getByText('최고'));

      await act(async () => {
        fireEvent.press(getByText('체크인 완료'));
      });

      expect(queryByText('좋은 아침!')).toBeNull();
    });
  });

  // --- 6. Navigation ---
  describe('navigation', () => {
    it('calls goBack when back button pressed', () => {
      const { getByText } = render(<CheckinScreen />);
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
