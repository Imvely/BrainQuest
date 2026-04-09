import React from 'react';
import { render } from '@testing-library/react-native';
import HpBar from '../HpBar';

describe('HpBar', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<HpBar current={50} max={100} />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays HP text by default', () => {
    const { getByText } = render(<HpBar current={75} max={100} />);
    expect(getByText('75/100')).toBeTruthy();
  });

  it('hides text when showText=false', () => {
    const { queryByText } = render(<HpBar current={75} max={100} showText={false} />);
    expect(queryByText('75/100')).toBeNull();
  });

  it('shows label when provided', () => {
    const { getByText } = render(<HpBar current={50} max={100} label="Monster HP" />);
    expect(getByText('Monster HP')).toBeTruthy();
  });

  it('clamps negative current to 0 display', () => {
    const { getByText } = render(<HpBar current={-10} max={100} />);
    expect(getByText('0/100')).toBeTruthy();
  });

  it('renders at full HP', () => {
    const { getByText } = render(<HpBar current={100} max={100} />);
    expect(getByText('100/100')).toBeTruthy();
  });

  it('renders at zero HP', () => {
    const { getByText } = render(<HpBar current={0} max={100} />);
    expect(getByText('0/100')).toBeTruthy();
  });

  it('handles max=0 without crash', () => {
    const { toJSON } = render(<HpBar current={0} max={0} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom height', () => {
    const { toJSON } = render(<HpBar current={50} max={100} height={20} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with custom color', () => {
    const { toJSON } = render(<HpBar current={50} max={100} color="#00FF00" />);
    expect(toJSON()).toBeTruthy();
  });
});
