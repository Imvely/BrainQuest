import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../LoginScreen';

describe('LoginScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<LoginScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays app title', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('BrainQuest')).toBeTruthy();
  });

  it('displays subtitle', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('ADHD를 위한 올인원 라이프 RPG')).toBeTruthy();
  });

  it('shows all three login buttons', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('카카오로 시작하기')).toBeTruthy();
    expect(getByText('Google로 시작하기')).toBeTruthy();
    expect(getByText('Apple로 시작하기')).toBeTruthy();
  });

  it('login buttons are pressable', () => {
    const { getByText } = render(<LoginScreen />);
    // Should not throw when pressed
    fireEvent.press(getByText('카카오로 시작하기'));
    fireEvent.press(getByText('Google로 시작하기'));
    fireEvent.press(getByText('Apple로 시작하기'));
  });
});
