import React from 'react';
import { render } from '@testing-library/react-native';
import ScreeningScreen from '../ScreeningScreen';

describe('ScreeningScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<ScreeningScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays screening title', () => {
    const { getByText } = render(<ScreeningScreen />);
    expect(getByText('ASRS 스크리닝')).toBeTruthy();
  });

  it('displays description text', () => {
    const { getByText } = render(<ScreeningScreen />);
    expect(getByText('간단한 자가 진단으로 시작해볼까요?')).toBeTruthy();
  });
});
