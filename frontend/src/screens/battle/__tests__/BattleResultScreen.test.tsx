import React from 'react';
import { render } from '@testing-library/react-native';
import BattleResultScreen from '../BattleResultScreen';

describe('BattleResultScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<BattleResultScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<BattleResultScreen />);
    expect(getByText('전투 결과')).toBeTruthy();
  });
});
