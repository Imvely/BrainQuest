import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmojiSelector from '../EmojiSelector';

const mockOptions = [
  { value: 1, emoji: '😴', label: 'Bad' },
  { value: 2, emoji: '😐', label: 'Okay' },
  { value: 3, emoji: '😊', label: 'Good' },
];

describe('EmojiSelector', () => {
  const defaultProps = {
    options: mockOptions,
    selected: null as number | null,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all options with emojis and labels', () => {
    const { getByText } = render(<EmojiSelector {...defaultProps} />);
    mockOptions.forEach((opt) => {
      expect(getByText(opt.emoji)).toBeTruthy();
      expect(getByText(opt.label)).toBeTruthy();
    });
  });

  it('renders label when provided', () => {
    const { getByText } = render(
      <EmojiSelector {...defaultProps} label="How are you?" />
    );
    expect(getByText('How are you?')).toBeTruthy();
  });

  it('does not render label when not provided', () => {
    const { queryByText } = render(<EmojiSelector {...defaultProps} />);
    expect(queryByText('How are you?')).toBeNull();
  });

  it('calls onSelect with correct value when option is tapped', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <EmojiSelector {...defaultProps} onSelect={onSelect} />
    );
    fireEvent.press(getByText('😊'));
    expect(onSelect).toHaveBeenCalledWith(3);
  });

  it('highlights selected option with border', () => {
    const { toJSON } = render(
      <EmojiSelector {...defaultProps} selected={2} />
    );
    const tree = toJSON();
    // The structure is: container > [label?, row]
    // row contains TouchableOpacity children for each option
    const row = tree.children.find(
      (c: any) => c.props?.style && Array.isArray(c.children) && c.children.length === mockOptions.length
    ) || tree.children[tree.children.length - 1];
    // The second option (value=2) should have selectedOption style with borderWidth
    const secondOption = row.children[1];
    const flatStyle = Array.isArray(secondOption.props.style)
      ? Object.assign({}, ...secondOption.props.style.filter(Boolean))
      : secondOption.props.style;
    expect(flatStyle.borderWidth).toBe(1);
  });
});
