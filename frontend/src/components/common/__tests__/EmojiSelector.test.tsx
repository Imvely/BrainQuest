import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmojiSelector from '../EmojiSelector';

const OPTIONS = [
  { value: 1, emoji: '😴', label: '나쁨' },
  { value: 2, emoji: '😐', label: '보통' },
  { value: 3, emoji: '😊', label: '좋음' },
];

describe('EmojiSelector', () => {
  it('renders all options', () => {
    const { getByText } = render(
      <EmojiSelector options={OPTIONS} selected={null} onSelect={jest.fn()} />,
    );
    expect(getByText('나쁨')).toBeTruthy();
    expect(getByText('보통')).toBeTruthy();
    expect(getByText('좋음')).toBeTruthy();
  });

  it('renders label when provided', () => {
    const { getByText } = render(
      <EmojiSelector options={OPTIONS} selected={null} onSelect={jest.fn()} label="수면의 질" />,
    );
    expect(getByText('수면의 질')).toBeTruthy();
  });

  it('does not render label when not provided', () => {
    const { queryByText } = render(
      <EmojiSelector options={OPTIONS} selected={null} onSelect={jest.fn()} />,
    );
    expect(queryByText('수면의 질')).toBeNull();
  });

  it('calls onSelect when option is tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <EmojiSelector options={OPTIONS} selected={null} onSelect={onSelect} />,
    );
    fireEvent.press(getByText('좋음'));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('renders emojis', () => {
    const { getByText } = render(
      <EmojiSelector options={OPTIONS} selected={null} onSelect={jest.fn()} />,
    );
    OPTIONS.forEach((opt) => {
      expect(getByText(opt.emoji)).toBeTruthy();
    });
  });

  it('handles empty options gracefully', () => {
    const { toJSON } = render(
      <EmojiSelector options={[]} selected={null} onSelect={jest.fn()} />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
