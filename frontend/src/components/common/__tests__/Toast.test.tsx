import React from 'react';
import { render } from '@testing-library/react-native';
import Toast from '../Toast';
import { Colors } from '../../../constants/colors';

describe('Toast', () => {
  const defaultProps = {
    message: 'Test message',
    visible: false,
    onHide: jest.fn(),
  };

  it('returns null when visible=false', () => {
    const { toJSON } = render(<Toast {...defaultProps} visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it('renders message when visible=true', () => {
    const { getByText } = render(<Toast {...defaultProps} visible={true} />);
    expect(getByText('Test message')).toBeTruthy();
  });

  it('applies exp type color as borderLeftColor', () => {
    const { toJSON } = render(
      <Toast {...defaultProps} visible={true} type="exp" />
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.borderLeftColor).toBe(Colors.PRIMARY);
  });

  it('applies gold type color as borderLeftColor', () => {
    const { toJSON } = render(
      <Toast {...defaultProps} visible={true} type="gold" />
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.borderLeftColor).toBe(Colors.RARITY_LEGENDARY);
  });

  it('applies success type color as borderLeftColor', () => {
    const { toJSON } = render(
      <Toast {...defaultProps} visible={true} type="success" />
    );
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.borderLeftColor).toBe(Colors.SUCCESS);
  });
});
