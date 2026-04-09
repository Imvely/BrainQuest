import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CheckpointList from '../CheckpointList';
import { Checkpoint } from '../../../types/quest';

const makeCheckpoints = (overrides: Partial<Checkpoint>[] = []): Checkpoint[] => {
  const defaults: Checkpoint[] = [
    { id: 1, questId: 1, orderNum: 1, title: '재료 준비', estimatedMin: 5, expReward: 5, goldReward: 2, status: 'COMPLETED', completedAt: '2026-04-08T10:00:00' },
    { id: 2, questId: 1, orderNum: 2, title: '요리 시작', estimatedMin: 10, expReward: 10, goldReward: 5, status: 'IN_PROGRESS' },
    { id: 3, questId: 1, orderNum: 3, title: '플레이팅', estimatedMin: 5, expReward: 5, goldReward: 3, status: 'PENDING' },
  ];
  return defaults.map((cp, i) => ({ ...cp, ...overrides[i] }));
};

describe('CheckpointList', () => {
  const onComplete = jest.fn();
  const onBattle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Rendering ---
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(
        <CheckpointList checkpoints={makeCheckpoints()} onComplete={onComplete} onBattle={onBattle} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('displays all checkpoint titles', () => {
      const { getByText } = render(
        <CheckpointList checkpoints={makeCheckpoints()} onComplete={onComplete} onBattle={onBattle} />,
      );
      expect(getByText('재료 준비')).toBeTruthy();
      expect(getByText('요리 시작')).toBeTruthy();
      expect(getByText('플레이팅')).toBeTruthy();
    });

    it('displays time and reward for each checkpoint', () => {
      const { getAllByText } = render(
        <CheckpointList checkpoints={makeCheckpoints()} onComplete={onComplete} onBattle={onBattle} />,
      );
      expect(getAllByText(/min/).length).toBe(3);
      expect(getAllByText(/XP/).length).toBe(3);
    });

    it('shows check mark for completed checkpoint', () => {
      const { getAllByText } = render(
        <CheckpointList checkpoints={makeCheckpoints()} onComplete={onComplete} onBattle={onBattle} />,
      );
      // At least one check mark visible for COMPLETED checkpoint
      expect(getAllByText('✓').length).toBeGreaterThanOrEqual(1);
    });
  });

  // --- 2. Interaction ---
  describe('interaction', () => {
    it('shows action buttons when pending checkpoint tapped', () => {
      const { getByText } = render(
        <CheckpointList checkpoints={makeCheckpoints()} onComplete={onComplete} onBattle={onBattle} />,
      );
      fireEvent.press(getByText('플레이팅'));
      expect(getByText('전투 모드로 시작!')).toBeTruthy();
      expect(getByText('그냥 완료 처리')).toBeTruthy();
    });

    it('calls onBattle when "전투 모드" tapped', () => {
      const checkpoints = makeCheckpoints();
      const { getByText } = render(
        <CheckpointList checkpoints={checkpoints} onComplete={onComplete} onBattle={onBattle} />,
      );
      fireEvent.press(getByText('플레이팅'));
      fireEvent.press(getByText('전투 모드로 시작!'));
      expect(onBattle).toHaveBeenCalledWith(checkpoints[2]);
    });

    it('calls onComplete when "그냥 완료" tapped', () => {
      const checkpoints = makeCheckpoints();
      const { getByText } = render(
        <CheckpointList checkpoints={checkpoints} onComplete={onComplete} onBattle={onBattle} />,
      );
      fireEvent.press(getByText('플레이팅'));
      fireEvent.press(getByText('그냥 완료 처리'));
      expect(onComplete).toHaveBeenCalledWith(checkpoints[2]);
    });

    it('does not show action buttons for completed checkpoint', () => {
      const { getByText, queryByText } = render(
        <CheckpointList checkpoints={makeCheckpoints()} onComplete={onComplete} onBattle={onBattle} />,
      );
      fireEvent.press(getByText('재료 준비'));
      expect(queryByText('전투 모드로 시작!')).toBeNull();
    });

    it('toggles action buttons off on second tap', () => {
      const { getByText, queryByText } = render(
        <CheckpointList checkpoints={makeCheckpoints()} onComplete={onComplete} onBattle={onBattle} />,
      );
      fireEvent.press(getByText('플레이팅'));
      expect(getByText('그냥 완료 처리')).toBeTruthy();
      fireEvent.press(getByText('플레이팅'));
      expect(queryByText('그냥 완료 처리')).toBeNull();
    });
  });

  // --- 3. Edge cases ---
  describe('edge cases', () => {
    it('renders empty checkpoint list', () => {
      const { toJSON } = render(
        <CheckpointList checkpoints={[]} onComplete={onComplete} onBattle={onBattle} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('renders single checkpoint', () => {
      const single = [makeCheckpoints()[0]];
      const { getByText } = render(
        <CheckpointList checkpoints={single} onComplete={onComplete} onBattle={onBattle} />,
      );
      expect(getByText('재료 준비')).toBeTruthy();
    });

    it('renders all-completed checkpoints', () => {
      const allDone = makeCheckpoints().map((cp) => ({ ...cp, status: 'COMPLETED' as const }));
      const { getAllByText } = render(
        <CheckpointList checkpoints={allDone} onComplete={onComplete} onBattle={onBattle} />,
      );
      expect(getAllByText('✓').length).toBe(3);
    });
  });
});
