import React from 'react';
import { render } from '@testing-library/react-native';
import ProgressBar from '../ProgressBar';
import { Colors } from '../../../constants/colors';

describe('ProgressBar', () => {
  it('renders without crash', () => {
    const { toJSON } = render(<ProgressBar progress={0.5} />);
    expect(toJSON()).toBeTruthy();
  });

  it('clamps progress below 0 to 0%', () => {
    const { toJSON } = render(<ProgressBar progress={-0.5} />);
    const tree = toJSON();
    const fillBar = tree.children[0];
    const flatStyle = Array.isArray(fillBar.props.style)
      ? Object.assign({}, ...fillBar.props.style.filter(Boolean))
      : fillBar.props.style;
    expect(flatStyle.width).toBe('0%');
  });

  it('clamps progress above 1 to 100%', () => {
    const { toJSON } = render(<ProgressBar progress={1.5} />);
    const tree = toJSON();
    const fillBar = tree.children[0];
    const flatStyle = Array.isArray(fillBar.props.style)
      ? Object.assign({}, ...fillBar.props.style.filter(Boolean))
      : fillBar.props.style;
    expect(flatStyle.width).toBe('100%');
  });

  it('applies custom color', () => {
    const { toJSON } = render(<ProgressBar progress={0.5} color="#FF0000" />);
    const tree = toJSON();
    const fillBar = tree.children[0];
    const flatStyle = Array.isArray(fillBar.props.style)
      ? Object.assign({}, ...fillBar.props.style.filter(Boolean))
      : fillBar.props.style;
    expect(flatStyle.backgroundColor).toBe('#FF0000');
  });

  it('applies custom height', () => {
    const { toJSON } = render(<ProgressBar progress={0.5} height={16} />);
    const tree = toJSON();
    const flatStyle = Array.isArray(tree.props.style)
      ? Object.assign({}, ...tree.props.style.filter(Boolean))
      : tree.props.style;
    expect(flatStyle.height).toBe(16);
  });
});
