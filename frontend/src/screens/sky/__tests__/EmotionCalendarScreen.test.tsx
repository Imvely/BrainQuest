import React from 'react';
import { render } from '@testing-library/react-native';
import EmotionCalendarScreen from '../EmotionCalendarScreen';

describe('EmotionCalendarScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<EmotionCalendarScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    expect(getByText('감정 캘린더')).toBeTruthy();
  });
});
