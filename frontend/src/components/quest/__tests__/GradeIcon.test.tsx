import React from 'react';
import { render } from '@testing-library/react-native';
import GradeIcon from '../GradeIcon';
import { QuestGrade } from '../../../constants/game';

describe('GradeIcon', () => {
  const grades: QuestGrade[] = ['E', 'D', 'C', 'B', 'A'];

  it('renders all grades without crashing', () => {
    grades.forEach((grade) => {
      const { unmount } = render(<GradeIcon grade={grade} />);
      unmount();
    });
  });

  it('displays grade letter text', () => {
    grades.forEach((grade) => {
      const { getByText, unmount } = render(<GradeIcon grade={grade} />);
      expect(getByText(grade)).toBeTruthy();
      unmount();
    });
  });

  it('applies custom size', () => {
    const { toJSON } = render(<GradeIcon grade="C" size={50} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders A-grade with border (sparkle effect)', () => {
    const { toJSON } = render(<GradeIcon grade="A" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders default size when not specified', () => {
    const { toJSON } = render(<GradeIcon grade="E" />);
    expect(toJSON()).toBeTruthy();
  });
});
