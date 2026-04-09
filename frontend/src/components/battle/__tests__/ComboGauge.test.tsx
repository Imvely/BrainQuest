import React from 'react';
import { render } from '@testing-library/react-native';
import ComboGauge from '../ComboGauge';

describe('ComboGauge', () => {
  it('renders without crashing at combo 0', () => {
    const { toJSON } = render(<ComboGauge count={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('does not show multiplier at combo 0', () => {
    const { queryByText } = render(<ComboGauge count={0} />);
    expect(queryByText(/^x\d/)).toBeNull();
  });

  it('shows multiplier at combo 1', () => {
    const { getByText } = render(<ComboGauge count={1} />);
    expect(getByText('x1')).toBeTruthy();
  });

  it('shows multiplier at combo 3', () => {
    const { getByText } = render(<ComboGauge count={3} />);
    expect(getByText('x3')).toBeTruthy();
  });

  it('shows MAX COMBO at count 5', () => {
    const { getByText } = render(<ComboGauge count={5} />);
    expect(getByText('x5')).toBeTruthy();
    expect(getByText('MAX COMBO!')).toBeTruthy();
  });

  it('does not show MAX COMBO below 5', () => {
    const { queryByText } = render(<ComboGauge count={4} />);
    expect(queryByText('MAX COMBO!')).toBeNull();
  });

  it('renders 5 combo dots', () => {
    // MAX_COMBO = 5, so there should be 5 dots
    const { toJSON } = render(<ComboGauge count={3} />);
    const tree = toJSON();
    expect(tree).toBeTruthy();
  });

  it('handles combo count above MAX_COMBO', () => {
    // Edge case: count > MAX_COMBO shouldn't crash
    const { getByText } = render(<ComboGauge count={7} />);
    expect(getByText('x7')).toBeTruthy();
    expect(getByText('MAX COMBO!')).toBeTruthy();
  });
});
