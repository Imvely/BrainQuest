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
});
