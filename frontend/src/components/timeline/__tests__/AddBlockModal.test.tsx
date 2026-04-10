import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AddBlockModal from '../AddBlockModal';
import { Quest } from '../../../types/quest';

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { View } = require('react-native');
  const BottomSheet = React.forwardRef(({ children, index }: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      snapToIndex: jest.fn(),
      close: jest.fn(),
    }));
    return index >= 0 ? <View>{children}</View> : null;
  });
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: BottomSheet,
    BottomSheetBackdrop: () => null,
    BottomSheetBackdropProps: {},
    BottomSheetView: ({ children }: any) => children,
    BottomSheetTextInput: TextInput,
  };
});

const MOCK_QUESTS: Quest[] = [
  {
    id: 1, userId: 1, originalTitle: '보고서', questTitle: '마법 보고서 작성', questStory: '',
    category: 'WORK', grade: 'C', estimatedMin: 60, expReward: 50, goldReward: 30,
    status: 'ACTIVE', checkpoints: [], createdAt: '', updatedAt: '',
  },
  {
    id: 2, userId: 1, originalTitle: '운동', questTitle: '체력 단련', questStory: '',
    category: 'HEALTH', grade: 'D', estimatedMin: 30, expReward: 25, goldReward: 15,
    status: 'IN_PROGRESS', checkpoints: [], createdAt: '', updatedAt: '',
  },
];

const defaultProps = {
  visible: true,
  initialStartTime: '09:00',
  initialEndTime: '10:00',
  blockDate: '2026-04-08',
  quests: MOCK_QUESTS,
  loading: false,
  onSubmit: jest.fn(),
  onClose: jest.fn(),
};

describe('AddBlockModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === 1. Rendering ===
  describe('rendering', () => {
    it('renders when visible', () => {
      const { getByText } = render(<AddBlockModal {...defaultProps} />);
      expect(getByText('타임블록 추가')).toBeTruthy();
    });

    it('returns null when not visible', () => {
      const { toJSON } = render(<AddBlockModal {...defaultProps} visible={false} />);
      expect(toJSON()).toBeNull();
    });

    it('shows title input placeholder', () => {
      const { getByPlaceholderText } = render(<AddBlockModal {...defaultProps} />);
      expect(getByPlaceholderText('무엇을 할 예정인가요?')).toBeTruthy();
    });

    it('shows all 6 category chips', () => {
      const { getByText } = render(<AddBlockModal {...defaultProps} />);
      expect(getByText('업무')).toBeTruthy();
      expect(getByText('생활')).toBeTruthy();
      expect(getByText('건강')).toBeTruthy();
      expect(getByText('소셜')).toBeTruthy();
      expect(getByText('휴식')).toBeTruthy();
      expect(getByText('기타')).toBeTruthy();
    });

    it('shows time inputs with initial values', () => {
      const { getAllByDisplayValue } = render(<AddBlockModal {...defaultProps} />);
      expect(getAllByDisplayValue('09:00')).toHaveLength(1);
      expect(getAllByDisplayValue('10:00')).toHaveLength(1);
    });

    it('shows submit button', () => {
      const { getByText } = render(<AddBlockModal {...defaultProps} />);
      expect(getByText('블록 추가')).toBeTruthy();
    });
  });

  // === 2. Category selection ===
  describe('category selection', () => {
    it('selects different category on tap', () => {
      const { getByText } = render(<AddBlockModal {...defaultProps} />);
      fireEvent.press(getByText('건강'));
      // Visual state change — the chip should become active
      // We verify no crash and the component handles the state
    });
  });

  // === 3. Quest linking ===
  describe('quest linking', () => {
    it('shows quest options from active quests', () => {
      const { getByText } = render(<AddBlockModal {...defaultProps} />);
      expect(getByText('퀘스트 연결 (선택)')).toBeTruthy();
      expect(getByText('없음')).toBeTruthy();
      expect(getByText(/마법 보고서 작성/)).toBeTruthy();
      expect(getByText(/체력 단련/)).toBeTruthy();
    });

    it('does not show quest section when no active quests', () => {
      const { queryByText } = render(<AddBlockModal {...defaultProps} quests={[]} />);
      expect(queryByText('퀘스트 연결 (선택)')).toBeNull();
    });

    it('filters out completed quests', () => {
      const completedQuest: Quest[] = [{
        ...MOCK_QUESTS[0], status: 'COMPLETED',
      }];
      const { queryByText } = render(<AddBlockModal {...defaultProps} quests={completedQuest} />);
      expect(queryByText('퀘스트 연결 (선택)')).toBeNull();
    });
  });

  // === 4. Form submission ===
  describe('submission', () => {
    it('does not submit with empty title', () => {
      const onSubmit = jest.fn();
      const { getByText } = render(<AddBlockModal {...defaultProps} onSubmit={onSubmit} />);
      fireEvent.press(getByText('블록 추가'));
      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('submits with valid title', () => {
      const onSubmit = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <AddBlockModal {...defaultProps} onSubmit={onSubmit} />,
      );
      fireEvent.changeText(getByPlaceholderText('무엇을 할 예정인가요?'), '프로젝트 작업');
      fireEvent.press(getByText('블록 추가'));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          blockDate: '2026-04-08',
          startTime: '09:00',
          endTime: '10:00',
          category: 'WORK',
          title: '프로젝트 작업',
        }),
      );
    });

    it('trims whitespace from title', () => {
      const onSubmit = jest.fn();
      const { getByPlaceholderText, getByText } = render(
        <AddBlockModal {...defaultProps} onSubmit={onSubmit} />,
      );
      fireEvent.changeText(getByPlaceholderText('무엇을 할 예정인가요?'), '  회의  ');
      fireEvent.press(getByText('블록 추가'));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: '회의' }),
      );
    });

    it('shows loading state on button', () => {
      const { getByText } = render(<AddBlockModal {...defaultProps} loading={true} />);
      // Button should be disabled with spinner — verify no crash
      expect(getByText('타임블록 추가')).toBeTruthy();
    });
  });

  // === 5. Time editing ===
  describe('time editing', () => {
    it('allows editing start time', () => {
      const onSubmit = jest.fn();
      const { getAllByDisplayValue, getByPlaceholderText, getByText } = render(
        <AddBlockModal {...defaultProps} onSubmit={onSubmit} />,
      );
      fireEvent.changeText(getAllByDisplayValue('09:00')[0], '10:00');
      fireEvent.changeText(getByPlaceholderText('무엇을 할 예정인가요?'), '변경 테스트');
      fireEvent.press(getByText('블록 추가'));
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ startTime: '10:00' }),
      );
    });
  });
});
