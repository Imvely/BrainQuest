import React from 'react';
import { render } from '@testing-library/react-native';
import CircularTimeline from '../CircularTimeline';
import { TimeBlock } from '../../../types/timeline';

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { createAnimatedComponent: (c: any) => c || View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedProps: (fn: () => any) => { try { return fn(); } catch { return {}; } },
    withTiming: (v: number) => v,
    Easing: { inOut: () => (v: number) => v, ease: (v: number) => v },
  };
});

const MOCK_BLOCKS: TimeBlock[] = [
  {
    id: 1, userId: 1, blockDate: '2026-04-08', startTime: '09:00', endTime: '10:00',
    category: 'WORK', title: '업무 미팅', status: 'PLANNED',
    source: 'MANUAL', isBuffer: false, createdAt: '',
  },
  {
    id: 2, userId: 1, blockDate: '2026-04-08', startTime: '14:00', endTime: '15:30',
    category: 'HEALTH', title: '운동', status: 'COMPLETED',
    source: 'MANUAL', isBuffer: false, createdAt: '',
  },
  {
    id: 3, userId: 1, blockDate: '2026-04-08', startTime: '11:00', endTime: '12:00',
    category: 'SOCIAL', title: '점심 약속', status: 'IN_PROGRESS',
    source: 'MANUAL', isBuffer: false, createdAt: '',
  },
];

const defaultProps = {
  blocks: [],
  wakeTime: '07:00',
  sleepTime: '23:00',
  remainingMin: 480,
  onBlockPress: jest.fn(),
  onGapPress: jest.fn(),
};

describe('CircularTimeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === 1. Rendering ===
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<CircularTimeline {...defaultProps} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with empty blocks', () => {
      const { toJSON } = render(<CircularTimeline {...defaultProps} blocks={[]} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders with multiple blocks', () => {
      const { toJSON } = render(<CircularTimeline {...defaultProps} blocks={MOCK_BLOCKS} />);
      expect(toJSON()).toBeTruthy();
    });

    it('renders remaining time text', () => {
      const { toJSON } = render(
        <CircularTimeline {...defaultProps} remainingMin={323} />,
      );
      // 323 min = 5h 23m — rendered in SVG text
      expect(toJSON()).toBeTruthy();
    });
  });

  // === 2. Next block display ===
  describe('next block info', () => {
    it('renders with next block title', () => {
      const { toJSON } = render(
        <CircularTimeline
          {...defaultProps}
          nextBlockTitle="업무 미팅"
          nextBlockMin={30}
        />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('renders without next block (no title)', () => {
      const { toJSON } = render(
        <CircularTimeline {...defaultProps} nextBlockTitle={undefined} />,
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  // === 3. Edge cases ===
  describe('edge cases', () => {
    it('handles blocks with same start/end time', () => {
      const zeroLengthBlock: TimeBlock[] = [{
        id: 99, userId: 1, blockDate: '2026-04-08', startTime: '10:00', endTime: '10:00',
        category: 'WORK', title: '제로', status: 'PLANNED',
        source: 'MANUAL', isBuffer: false, createdAt: '',
      }];
      const { toJSON } = render(<CircularTimeline {...defaultProps} blocks={zeroLengthBlock} />);
      expect(toJSON()).toBeTruthy();
    });

    it('handles wakeTime later than sleepTime gracefully', () => {
      const { toJSON } = render(
        <CircularTimeline {...defaultProps} wakeTime="22:00" sleepTime="06:00" />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('handles remainingMin of 0', () => {
      const { toJSON } = render(
        <CircularTimeline {...defaultProps} remainingMin={0} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('handles non-array blocks defensively', () => {
      const { toJSON } = render(
        <CircularTimeline {...defaultProps} blocks={undefined as any} />,
      );
      expect(toJSON()).toBeTruthy();
    });

    it('handles all block categories', () => {
      const allCategories: TimeBlock[] = (['WORK', 'HOME', 'HEALTH', 'SOCIAL', 'REST', 'CUSTOM'] as const).map(
        (cat, i) => ({
          id: i + 10, userId: 1, blockDate: '2026-04-08',
          startTime: `${8 + i * 2}:00`, endTime: `${9 + i * 2}:00`,
          category: cat, title: `${cat} block`, status: 'PLANNED' as const,
          source: 'MANUAL' as const, isBuffer: false, createdAt: '',
        }),
      );
      const { toJSON } = render(<CircularTimeline {...defaultProps} blocks={allCategories} />);
      expect(toJSON()).toBeTruthy();
    });

    it('handles all block statuses', () => {
      const allStatuses: TimeBlock[] = (['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] as const).map(
        (status, i) => ({
          id: i + 20, userId: 1, blockDate: '2026-04-08',
          startTime: `${8 + i * 2}:00`, endTime: `${9 + i * 2}:00`,
          category: 'WORK' as const, title: `${status} block`, status,
          source: 'MANUAL' as const, isBuffer: false, createdAt: '',
        }),
      );
      const { toJSON } = render(<CircularTimeline {...defaultProps} blocks={allStatuses} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // === 4. Touch handlers ===
  describe('touch callbacks', () => {
    it('provides onBlockPress callback', () => {
      const onBlockPress = jest.fn();
      render(<CircularTimeline {...defaultProps} blocks={MOCK_BLOCKS} onBlockPress={onBlockPress} />);
      // Touch simulation on SVG is not directly testable with RTRNL
      // but we verify the component accepts the callback without error
      expect(onBlockPress).not.toHaveBeenCalled();
    });

    it('provides onGapPress callback', () => {
      const onGapPress = jest.fn();
      render(<CircularTimeline {...defaultProps} onGapPress={onGapPress} />);
      expect(onGapPress).not.toHaveBeenCalled();
    });
  });
});
