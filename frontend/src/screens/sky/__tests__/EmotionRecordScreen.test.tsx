import React from 'react';
import { render } from '@testing-library/react-native';
import EmotionRecordScreen from '../EmotionRecordScreen';

describe('EmotionRecordScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<EmotionRecordScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    expect(getByText('감정 날씨 기록')).toBeTruthy();
  });

  it('displays description', () => {
    const { getByText } = render(<EmotionRecordScreen />);
    expect(getByText('지금 기분은 어떤 날씨인가요?')).toBeTruthy();
  });
});
