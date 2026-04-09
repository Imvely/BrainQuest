import React from 'react';
import { render } from '@testing-library/react-native';
import BattleResultScreen from '../BattleResultScreen';

describe('BattleResultScreen', () => {
  it('renders without crash and displays title text', () => {
    const { getByText } = render(<BattleResultScreen />);
    expect(getByText('전투 결과')).toBeTruthy();
  });
});
