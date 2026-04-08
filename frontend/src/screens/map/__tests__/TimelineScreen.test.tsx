import React from 'react';
import { render } from '@testing-library/react-native';
import TimelineScreen from '../TimelineScreen';

describe('TimelineScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<TimelineScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays main title', () => {
    const { getByText } = render(<TimelineScreen />);
    expect(getByText('오늘의 모험 지도')).toBeTruthy();
  });

  it('displays placeholder description', () => {
    const { getByText } = render(<TimelineScreen />);
    expect(getByText('타임라인이 여기에 표시됩니다')).toBeTruthy();
  });
});
