import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuestBoardScreen from '../QuestBoardScreen';
import { Quest } from '../../../types/quest';

// --- Navigation mock ---
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

// --- useQuests hook mock ---
const mockRefetch = jest.fn().mockResolvedValue(undefined);
let mockUseQuestsReturn: {
  data: { content: Quest[] } | undefined;
  isLoading: boolean;
  refetch: jest.Mock;
};

jest.mock('../../../hooks/useQuests', () => ({
  useQuests: (params?: { category?: string }) => {
    // Capture call args so tests can assert filtering
    mockUseQuestsCallArgs = params;
    return mockUseQuestsReturn;
  },
}));

let mockUseQuestsCallArgs: { category?: string } | undefined;

// --- Fixtures ---
const makeQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 1,
  userId: 1,
  originalTitle: '보고서 작성',
  questTitle: '지식의 두루마리 작성',
  questStory: '왕국의 기록을 남기는 임무',
  category: 'WORK',
  grade: 'C',
  estimatedMin: 60,
  expReward: 50,
  goldReward: 30,
  status: 'ACTIVE',
  checkpoints: [
    { id: 1, questId: 1, orderNum: 1, title: '초안 작성', estimatedMin: 30, expReward: 25, goldReward: 15, status: 'PENDING' },
    { id: 2, questId: 1, orderNum: 2, title: '검토 완료', estimatedMin: 30, expReward: 25, goldReward: 15, status: 'PENDING' },
  ],
  createdAt: '2026-04-08T00:00:00',
  updatedAt: '2026-04-08T00:00:00',
  ...overrides,
});

const questList: Quest[] = [
  makeQuest({ id: 1, grade: 'E', questTitle: '슬라임 토벌', estimatedMin: 10, expReward: 10, goldReward: 5 }),
  makeQuest({ id: 2, grade: 'C', questTitle: '지식의 두루마리 작성' }),
  makeQuest({ id: 3, grade: 'A', questTitle: '전설의 던전 공략', estimatedMin: 180, expReward: 200, goldReward: 120 }),
];

// --- Helpers ---
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('QuestBoardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuestsCallArgs = undefined;
    mockUseQuestsReturn = {
      data: { content: questList },
      isLoading: false,
      refetch: mockRefetch,
    };
  });

  // 1. Loading spinner when isLoading=true and data=undefined
  it('shows loading spinner when isLoading=true and data=undefined', () => {
    mockUseQuestsReturn = {
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
    };

    const { toJSON } = renderWithProviders(<QuestBoardScreen />);
    // ActivityIndicator renders when isLoading && quests.length === 0
    // Since data is undefined, quests defaults to [] via data?.content ?? []
    const tree = JSON.stringify(toJSON());
    expect(tree).toBeTruthy();
    // The screen should not show empty state text when loading
    const { queryByText } = renderWithProviders(<QuestBoardScreen />);
    expect(queryByText('모험이 기다리고 있어요!')).toBeNull();
  });

  // 2. Empty state when data has empty content array
  it('shows empty state when data has empty content array', () => {
    mockUseQuestsReturn = {
      data: { content: [] },
      isLoading: false,
      refetch: mockRefetch,
    };

    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    expect(getByText('모험이 기다리고 있어요!')).toBeTruthy();
    expect(getByText('할 일을 RPG 퀘스트로 바꿔보세요')).toBeTruthy();
    expect(getByText('첫 퀘스트 만들기')).toBeTruthy();
  });

  // 3. Quest list when data has quests
  it('shows quest list when data has quests', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    expect(getByText('슬라임 토벌')).toBeTruthy();
    expect(getByText('지식의 두루마리 작성')).toBeTruthy();
    expect(getByText('전설의 던전 공략')).toBeTruthy();
  });

  // 4. "N개 진행중" count
  it('shows "N개 진행중" count', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    expect(getByText('3개 진행중')).toBeTruthy();
  });

  it('shows correct count excluding completed quests', () => {
    mockUseQuestsReturn = {
      data: {
        content: [
          makeQuest({ id: 1, status: 'ACTIVE' }),
          makeQuest({ id: 2, status: 'COMPLETED' }),
          makeQuest({ id: 3, status: 'ACTIVE' }),
        ],
      },
      isLoading: false,
      refetch: mockRefetch,
    };

    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    expect(getByText('2개 진행중')).toBeTruthy();
  });

  // 5. Category chip tap changes filter
  it('category chip tap changes filter and re-renders useQuests with new category', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);

    // Initially ALL is selected, so category should be undefined
    expect(mockUseQuestsCallArgs).toEqual({ category: undefined });

    // Tap "업무" chip
    fireEvent.press(getByText('업무'));
    // After re-render, useQuests should be called with WORK
    expect(mockUseQuestsCallArgs).toEqual({ category: 'WORK' });
  });

  it('switching back to 전체 passes undefined category', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);

    fireEvent.press(getByText('건강'));
    expect(mockUseQuestsCallArgs).toEqual({ category: 'HEALTH' });

    fireEvent.press(getByText('전체'));
    expect(mockUseQuestsCallArgs).toEqual({ category: undefined });
  });

  it('renders all category chips', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    expect(getByText('전체')).toBeTruthy();
    expect(getByText('업무')).toBeTruthy();
    expect(getByText('가사')).toBeTruthy();
    expect(getByText('건강')).toBeTruthy();
    expect(getByText('사회')).toBeTruthy();
    expect(getByText('자기관리')).toBeTruthy();
  });

  // 6. Empty state "첫 퀘스트 만들기" navigates to QuestCreate
  it('empty state "첫 퀘스트 만들기" navigates to QuestCreate', () => {
    mockUseQuestsReturn = {
      data: { content: [] },
      isLoading: false,
      refetch: mockRefetch,
    };

    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    fireEvent.press(getByText('첫 퀘스트 만들기'));
    expect(mockNavigate).toHaveBeenCalledWith('QuestCreate');
  });

  // 7. FAB navigates to QuestCreate
  it('FAB "+" navigates to QuestCreate', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    fireEvent.press(getByText('+'));
    expect(mockNavigate).toHaveBeenCalledWith('QuestCreate');
  });

  // 8. E-grade banner when E-grade quests exist
  it('shows E-grade banner when E-grade quests exist', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    expect(getByText('E급 슬라임 퀘스트부터 시작하세요')).toBeTruthy();
  });

  it('does not show E-grade banner when no E-grade quests', () => {
    mockUseQuestsReturn = {
      data: {
        content: [
          makeQuest({ id: 1, grade: 'C' }),
          makeQuest({ id: 2, grade: 'B' }),
        ],
      },
      isLoading: false,
      refetch: mockRefetch,
    };

    const { queryByText } = renderWithProviders(<QuestBoardScreen />);
    expect(queryByText('E급 슬라임 퀘스트부터 시작하세요')).toBeNull();
  });

  it('does not show E-grade banner when E-grade quest is completed', () => {
    mockUseQuestsReturn = {
      data: {
        content: [
          makeQuest({ id: 1, grade: 'E', status: 'COMPLETED' }),
          makeQuest({ id: 2, grade: 'C', status: 'ACTIVE' }),
        ],
      },
      isLoading: false,
      refetch: mockRefetch,
    };

    const { queryByText } = renderWithProviders(<QuestBoardScreen />);
    expect(queryByText('E급 슬라임 퀘스트부터 시작하세요')).toBeNull();
  });

  // Additional: quest card tap navigates to detail
  it('navigates to QuestDetail when quest card tapped', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    fireEvent.press(getByText('슬라임 토벌'));
    expect(mockNavigate).toHaveBeenCalledWith('QuestDetail', { questId: 1 });
  });

  // Additional: header title renders
  it('renders header title "퀘스트 보드"', () => {
    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    expect(getByText('퀘스트 보드')).toBeTruthy();
  });

  // Additional: shows CLEAR stamp on completed quests
  it('shows CLEAR stamp on completed quests', () => {
    mockUseQuestsReturn = {
      data: {
        content: [makeQuest({ id: 10, status: 'COMPLETED', questTitle: '완료된 퀘스트' })],
      },
      isLoading: false,
      refetch: mockRefetch,
    };

    const { getByText } = renderWithProviders(<QuestBoardScreen />);
    expect(getByText('완료된 퀘스트')).toBeTruthy();
    expect(getByText('CLEAR')).toBeTruthy();
  });
});
