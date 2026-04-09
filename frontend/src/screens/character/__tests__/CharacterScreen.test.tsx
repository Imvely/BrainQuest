import React from 'react';
import { render } from '@testing-library/react-native';
import CharacterScreen from '../CharacterScreen';

describe('CharacterScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CharacterScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<CharacterScreen />);
    expect(getByText('캐릭터')).toBeTruthy();
  });

  // TODO: When fully implemented, add these tests:
  // - Character info display (name, class, level)
  // - Stat bars (ATK, WIS, DEF, AGI, HP)
  // - EXP progress bar with percentage
  // - Gold display
  // - Equipped items rendering
  // - Equipment slot tap → equip modal
  // - Level up animation trigger
  // - Loading state (spinner)
  // - API error state (retry button)
});
