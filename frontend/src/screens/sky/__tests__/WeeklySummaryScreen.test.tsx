import React from 'react';
import { render } from '@testing-library/react-native';
import WeeklySummaryScreen from '../WeeklySummaryScreen';

describe('WeeklySummaryScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<WeeklySummaryScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<WeeklySummaryScreen />);
    expect(getByText('주간 요약')).toBeTruthy();
  });
});
