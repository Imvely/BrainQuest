import React from 'react';
import { render } from '@testing-library/react-native';
import WeeklySummaryScreen from '../WeeklySummaryScreen';

describe('WeeklySummaryScreen', () => {
  it('renders without crash and displays title text', () => {
    const { getByText } = render(<WeeklySummaryScreen />);
    expect(getByText('주간 요약')).toBeTruthy();
  });
});
