import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Header from '../Header';

describe('Header', () => {
  it('renders title', () => {
    const { getByText } = render(<Header title="테스트 제목" />);
    expect(getByText('테스트 제목')).toBeTruthy();
  });

  it('renders without back button when onBack is not provided', () => {
    const { queryByText } = render(<Header title="제목" />);
    expect(queryByText('<')).toBeNull();
  });

  it('renders back button when onBack is provided', () => {
    const { getByText } = render(<Header title="제목" onBack={jest.fn()} />);
    expect(getByText('<')).toBeTruthy();
  });

  it('calls onBack when back button is pressed', () => {
    const onBack = jest.fn();
    const { getByText } = render(<Header title="제목" onBack={onBack} />);
    fireEvent.press(getByText('<'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders right element when provided', () => {
    const { getByText } = render(
      <Header title="제목" rightElement={<Text>오른쪽</Text>} />,
    );
    expect(getByText('오른쪽')).toBeTruthy();
  });
});
