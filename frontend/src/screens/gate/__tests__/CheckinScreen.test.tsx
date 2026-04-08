import React from 'react';
import { render } from '@testing-library/react-native';
import CheckinScreen from '../CheckinScreen';

describe('CheckinScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CheckinScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<CheckinScreen />);
    expect(getByText('데일리 체크인')).toBeTruthy();
  });
});
