import React from 'react';
import { render } from '@testing-library/react-native';
import Toast from '../Toast';

describe('Toast', () => {
  it('renders nothing when not visible', () => {
    const { toJSON } = render(
      <Toast message="테스트" visible={false} onHide={jest.fn()} />,
    );
    expect(toJSON()).toBeNull();
  });

  it('renders message when visible', () => {
    const { getByText } = render(
      <Toast message="+10 EXP" visible={true} onHide={jest.fn()} />,
    );
    expect(getByText('+10 EXP')).toBeTruthy();
  });

  it('renders with different types', () => {
    const types = ['exp', 'gold', 'info', 'success'] as const;
    types.forEach((type) => {
      const { getByText } = render(
        <Toast message="보상" visible={true} onHide={jest.fn()} type={type} />,
      );
      expect(getByText('보상')).toBeTruthy();
    });
  });

  it('accepts custom duration', () => {
    const { getByText } = render(
      <Toast message="긴 토스트" visible={true} onHide={jest.fn()} duration={5000} />,
    );
    expect(getByText('긴 토스트')).toBeTruthy();
  });
});
