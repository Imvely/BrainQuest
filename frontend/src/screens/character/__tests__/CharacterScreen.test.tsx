import React from 'react';
import { render } from '@testing-library/react-native';
import CharacterScreen from '../CharacterScreen';

describe('CharacterScreen', () => {
  it('renders without crash and displays title text', () => {
    const { getByText } = render(<CharacterScreen />);
    expect(getByText('캐릭터')).toBeTruthy();
  });
});
