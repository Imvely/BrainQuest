import React from 'react';
import { render } from '@testing-library/react-native';
import CharacterCreateScreen from '../CharacterCreateScreen';

describe('CharacterCreateScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<CharacterCreateScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<CharacterCreateScreen />);
    expect(getByText('캐릭터 생성')).toBeTruthy();
  });

  it('displays description', () => {
    const { getByText } = render(<CharacterCreateScreen />);
    expect(getByText('나만의 모험가를 만들어보세요')).toBeTruthy();
  });
});
