import React from 'react';
import { render } from '@testing-library/react-native';
import MedicationScreen from '../MedicationScreen';

describe('MedicationScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<MedicationScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<MedicationScreen />);
    expect(getByText('약물 관리')).toBeTruthy();
  });
});
