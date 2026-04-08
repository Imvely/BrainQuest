import React from 'react';
import { render } from '@testing-library/react-native';
import QuestBoardScreen from '../QuestBoardScreen';

describe('QuestBoardScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<QuestBoardScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<QuestBoardScreen />);
    expect(getByText('퀘스트 보드')).toBeTruthy();
  });
});
