import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Header from '../Header';

describe('Header', () => {
  it('renders title text', () => {
    const { getByText } = render(<Header title="Test Title" />);
    expect(getByText('Test Title')).toBeTruthy();
  });

  it('shows back button when onBack is provided', () => {
    const onBack = jest.fn();
    const { getByText } = render(<Header title="Title" onBack={onBack} />);
    expect(getByText('<')).toBeTruthy();
  });

  it('hides back button when onBack is not provided', () => {
    const { queryByText } = render(<Header title="Title" />);
    expect(queryByText('<')).toBeNull();
  });

  it('calls onBack when back button is tapped', () => {
    const onBack = jest.fn();
    const { getByText } = render(<Header title="Title" onBack={onBack} />);
    fireEvent.press(getByText('<'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('renders rightElement when provided', () => {
    const rightElement = <Text>Right</Text>;
    const { getByText } = render(
      <Header title="Title" rightElement={rightElement} />
    );
    expect(getByText('Right')).toBeTruthy();
  });
});
