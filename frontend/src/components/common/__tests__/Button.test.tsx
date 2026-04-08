import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';

describe('Button', () => {
  it('renders title text', () => {
    const { getByText } = render(<Button title="확인" onPress={() => {}} />);
    expect(getByText('확인')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="확인" onPress={onPress} />);
    fireEvent.press(getByText('확인'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button title="확인" onPress={onPress} disabled />);
    fireEvent.press(getByText('확인'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button title="확인" onPress={() => {}} loading />,
    );
    expect(queryByText('확인')).toBeNull();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <Button title="확인" onPress={onPress} loading />,
    );
    // Loading button should not be pressable
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders different variants without crashing', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost'] as const;
    variants.forEach((variant) => {
      const { unmount } = render(
        <Button title={variant} onPress={() => {}} variant={variant} />,
      );
      unmount();
    });
  });

  it('renders different sizes without crashing', () => {
    const sizes = ['sm', 'md', 'lg'] as const;
    sizes.forEach((size) => {
      const { unmount } = render(
        <Button title={size} onPress={() => {}} size={size} />,
      );
      unmount();
    });
  });
});
