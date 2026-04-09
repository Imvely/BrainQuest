import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuestCard from '../QuestCard';
import { Quest } from '../../../types/quest';

const baseQuest: Quest = {
  id: 1,
  userId: 1,
  originalTitle: '설거지',
  questTitle: '마왕의 식기 정화 퀘스트',
  questStory: '어둠의 식기들을 정화하라!',
  category: 'HOME',
  grade: 'E',
  estimatedMin: 10,
  expReward: 10,
  goldReward: 5,
  status: 'ACTIVE',
  checkpoints: [
    { id: 1, questId: 1, orderNum: 1, title: '수세미 장비', estimatedMin: 3, expReward: 3, goldReward: 2, status: 'COMPLETED' },
    { id: 2, questId: 1, orderNum: 2, title: '접시 정화', estimatedMin: 7, expReward: 7, goldReward: 3, status: 'PENDING' },
  ],
  createdAt: '2026-04-08T00:00:00',
  updatedAt: '2026-04-08T00:00:00',
};

describe('QuestCard', () => {
  // --- 1. Rendering ---
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<QuestCard quest={baseQuest} onPress={jest.fn()} />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays quest title', () => {
      const { getByText } = render(<QuestCard quest={baseQuest} onPress={jest.fn()} />);
      expect(getByText('마왕의 식기 정화 퀘스트')).toBeTruthy();
    });

    it('displays original title', () => {
      const { getByText } = render(<QuestCard quest={baseQuest} onPress={jest.fn()} />);
      expect(getByText('설거지')).toBeTruthy();
    });

    it('displays grade badge', () => {
      const { getByText } = render(<QuestCard quest={baseQuest} onPress={jest.fn()} />);
      expect(getByText('E')).toBeTruthy();
    });

    it('displays estimated time', () => {
      const { getByText } = render(<QuestCard quest={baseQuest} onPress={jest.fn()} />);
      expect(getByText('10min')).toBeTruthy();
    });

    it('displays reward preview', () => {
      const { getByText } = render(<QuestCard quest={baseQuest} onPress={jest.fn()} />);
      expect(getByText('+10XP')).toBeTruthy();
      expect(getByText('+5G')).toBeTruthy();
    });
  });

  // --- 2. Interaction ---
  describe('interaction', () => {
    it('calls onPress with quest when tapped', () => {
      const onPress = jest.fn();
      const { getByText } = render(<QuestCard quest={baseQuest} onPress={onPress} />);
      fireEvent.press(getByText('마왕의 식기 정화 퀘스트'));
      expect(onPress).toHaveBeenCalledWith(baseQuest);
    });
  });

  // --- 3. Completed state ---
  describe('completed quest', () => {
    const completedQuest: Quest = { ...baseQuest, status: 'COMPLETED' };

    it('renders without crashing', () => {
      const { toJSON } = render(<QuestCard quest={completedQuest} onPress={jest.fn()} />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays CLEAR stamp', () => {
      const { getByText } = render(<QuestCard quest={completedQuest} onPress={jest.fn()} />);
      expect(getByText('CLEAR')).toBeTruthy();
    });
  });

  // --- 4. Urgent quest ---
  describe('urgent quest (due within 24h)', () => {
    // Use ISO timestamp to avoid timezone issues with date-only strings
    const soonIso = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    const urgentQuest: Quest = { ...baseQuest, dueDate: soonIso };

    it('renders without crashing', () => {
      const { toJSON } = render(<QuestCard quest={urgentQuest} onPress={jest.fn()} />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays countdown text', () => {
      const { getByText } = render(<QuestCard quest={urgentQuest} onPress={jest.fn()} />);
      expect(getByText(/시간 남음/)).toBeTruthy();
    });
  });

  // --- 5. Different grades ---
  describe('all grades render correctly', () => {
    const grades = ['E', 'D', 'C', 'B', 'A'] as const;

    grades.forEach((grade) => {
      it(`renders ${grade}-grade quest`, () => {
        const quest = { ...baseQuest, grade };
        const { getByText, unmount } = render(<QuestCard quest={quest} onPress={jest.fn()} />);
        expect(getByText(grade)).toBeTruthy();
        unmount();
      });
    });
  });

  // --- 6. Edge cases ---
  describe('edge cases', () => {
    it('renders with empty checkpoints', () => {
      const quest = { ...baseQuest, checkpoints: [] };
      const { toJSON } = render(<QuestCard quest={quest} onPress={jest.fn()} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with no due date', () => {
      const quest = { ...baseQuest, dueDate: undefined };
      const { queryByText } = render(<QuestCard quest={quest} onPress={jest.fn()} />);
      expect(queryByText(/남음/)).toBeNull();
    });

    it('renders past-due quest', () => {
      const quest = { ...baseQuest, dueDate: '2020-01-01' };
      const { toJSON } = render(<QuestCard quest={quest} onPress={jest.fn()} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
