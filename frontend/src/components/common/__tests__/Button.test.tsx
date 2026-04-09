import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import Button from '../Button';
import { Colors } from '../../../constants/colors';

describe('Button', () => {
  const defaultProps = {
    title: 'Test Button',
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title text', () => {
    const { getByText } = render(<Button {...defaultProps} />);
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button {...defaultProps} onPress={onPress} />);
    fireEvent.press(getByText('Test Button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows ActivityIndicator when loading=true', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button {...defaultProps} loading={true} />
    );
    expect(queryByText('Test Button')).toBeNull();
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('disabled button does not call onPress', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button {...defaultProps} onPress={onPress} disabled={true} />
    );
    fireEvent.press(getByText('Test Button'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('primary variant applies correct background color', () => {
    const { toJSON } = render(<Button {...defaultProps} variant="primary" />);
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.backgroundColor).toBe(Colors.PRIMARY);
  });

  it('secondary variant applies correct background color', () => {
    const { toJSON } = render(<Button {...defaultProps} variant="secondary" />);
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.backgroundColor).toBe(Colors.SECONDARY);
  });

  it('outline variant applies transparent background and border', () => {
    const { toJSON } = render(<Button {...defaultProps} variant="outline" />);
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.backgroundColor).toBe('transparent');
    expect(flatStyle.borderWidth).toBe(1);
    expect(flatStyle.borderColor).toBe(Colors.PRIMARY);
  });

  it('size sm applies height 44', () => {
    const { toJSON } = render(<Button {...defaultProps} size="sm" />);
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.height).toBe(44);
  });

  it('size md applies height 48', () => {
    const { toJSON } = render(<Button {...defaultProps} size="md" />);
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.height).toBe(48);
  });

  it('size lg applies height 56', () => {
    const { toJSON } = render(<Button {...defaultProps} size="lg" />);
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.height).toBe(56);
  });
});
