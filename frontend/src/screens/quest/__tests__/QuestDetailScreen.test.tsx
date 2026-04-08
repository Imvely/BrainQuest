import React from 'react';
import { render } from '@testing-library/react-native';
import QuestDetailScreen from '../QuestDetailScreen';

describe('QuestDetailScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<QuestDetailScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<QuestDetailScreen />);
    expect(getByText('퀘스트 상세')).toBeTruthy();
  });
});
