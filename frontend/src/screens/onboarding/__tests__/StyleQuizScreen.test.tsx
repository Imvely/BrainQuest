import React from 'react';
import { render } from '@testing-library/react-native';
import StyleQuizScreen from '../StyleQuizScreen';

describe('StyleQuizScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<StyleQuizScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<StyleQuizScreen />);
    expect(getByText('스타일 퀴즈')).toBeTruthy();
  });
});
