import React from 'react';
import { render } from '@testing-library/react-native';
import QuestCreateScreen from '../QuestCreateScreen';

describe('QuestCreateScreen', () => {
  it('renders without crashing', () => {
    const { toJSON } = render(<QuestCreateScreen />);
    expect(toJSON()).toBeTruthy();
  });

  it('displays title', () => {
    const { getByText } = render(<QuestCreateScreen />);
    expect(getByText('퀘스트 생성')).toBeTruthy();
  });

  it('displays description', () => {
    const { getByText } = render(<QuestCreateScreen />);
    expect(getByText('할 일을 퀘스트로 변환해보세요')).toBeTruthy();
  });
});
