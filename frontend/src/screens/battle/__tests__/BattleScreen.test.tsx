import React from 'react';
import { render } from '@testing-library/react-native';
import BattleScreen from '../BattleScreen';

describe('BattleScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<BattleScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<BattleScreen />);
    expect(getByText('전투 준비')).toBeTruthy();
  });

  it('displays description', () => {
    const { getByText } = render(<BattleScreen />);
    expect(getByText('집중 세션을 시작하세요')).toBeTruthy();
  });
});
