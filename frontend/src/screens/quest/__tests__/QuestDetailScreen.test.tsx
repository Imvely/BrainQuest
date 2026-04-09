import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuestDetailScreen from '../QuestDetailScreen';
import { Quest } from '../../../types/quest';

// --- Navigation mock ---
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, getParent: mockGetParent }),
  useRoute: () => ({ params: { questId: 1 } }),
}));

// --- Hook mocks ---
let mockQuestDetailReturn: {
  data: Quest | undefined;
  isLoading: boolean;
};

const mockCheckpointMutate = jest.fn();
let mockCompleteCheckpointReturn: {
  mutate: jest.Mock;
  isPending: boolean;
};

jest.mock('../../../hooks/useQuests', () => ({
  useQuestDetail: (_id: number) => mockQuestDetailReturn,
  useCompleteCheckpoint: () => mockCompleteCheckpointReturn,
}));

// --- Fixtures ---
const mockQuest: Quest = {
  id: 1,
  userId: 1,
  originalTitle: '보고서 작성',
  questTitle: '지식의 두루마리 작성',
  questStory: '왕국의 수석 학자가 당신에게 중대한 임무를 맡겼습니다. 3장짜리 보고서를 작성하여 왕에게 바쳐야 합니다.',
  category: 'WORK',
  grade: 'C',
  estimatedMin: 60,
  expReward: 50,
  goldReward: 30,
  status: 'ACTIVE',
  checkpoints: [
    { id: 10, questId: 1, orderNum: 1, title: '자료 수집', estimatedMin: 20, expReward: 15, goldReward: 10, status: 'COMPLETED', completedAt: '2026-04-08T10:00:00' },
    { id: 11, questId: 1, orderNum: 2, title: '초안 작성', estimatedMin: 25, expReward: 20, goldReward: 10, status: 'IN_PROGRESS' },
    { id: 12, questId: 1, orderNum: 3, title: '최종 검토', estimatedMin: 15, expReward: 15, goldReward: 10, status: 'PENDING' },
  ],
  createdAt: '2026-04-08T00:00:00',
  updatedAt: '2026-04-08T00:00:00',
};

// --- Helpers ---
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('QuestDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuestDetailReturn = {
      data: mockQuest,
      isLoading: false,
    };
    mockCompleteCheckpointReturn = {
      mutate: mockCheckpointMutate,
      isPending: false,
    };
  });

  // --- 1. Shows loading spinner when isLoading ---
  it('shows loading spinner when isLoading', () => {
    mockQuestDetailReturn = {
      data: undefined,
      isLoading: true,
    };

    const { toJSON } = renderWithProviders(<QuestDetailScreen />);
    // The screen renders a loading view with ActivityIndicator
    const tree = JSON.stringify(toJSON());
    expect(tree).toBeTruthy();
    // Should not show quest content
    const { queryByText } = renderWithProviders(<QuestDetailScreen />);
    expect(queryByText('지식의 두루마리 작성')).toBeNull();
  });

  // --- 2. Shows quest title and original title after load ---
  it('shows quest title and original title after load', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    expect(getByText('지식의 두루마리 작성')).toBeTruthy();
    expect(getByText('보고서 작성')).toBeTruthy();
  });

  // --- 3. Progress bar shows correct fraction ---
  it('progress bar shows correct fraction (1/3)', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    // 1 out of 3 checkpoints completed
    expect(getByText('1/3')).toBeTruthy();
    expect(getByText('진행률')).toBeTruthy();
  });

  it('progress shows 0/N when no checkpoints completed', () => {
    mockQuestDetailReturn = {
      data: {
        ...mockQuest,
        checkpoints: mockQuest.checkpoints.map((cp) => ({ ...cp, status: 'PENDING' as const })),
      },
      isLoading: false,
    };

    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    expect(getByText('0/3')).toBeTruthy();
  });

  // --- 4. Story card starts collapsed, tap shows "접기" and story text ---
  it('story card starts collapsed, tap shows "접기" and story text', () => {
    const { getByText, queryByText } = renderWithProviders(<QuestDetailScreen />);

    // Initially collapsed - shows 펼치기
    expect(getByText('펼치기')).toBeTruthy();
    expect(getByText('퀘스트 스토리')).toBeTruthy();
    // Story text should not be visible
    expect(queryByText(/왕국의 수석 학자/)).toBeNull();

    // Tap to expand
    fireEvent.press(getByText('펼치기'));

    // Now should show story and 접기
    expect(getByText('접기')).toBeTruthy();
    expect(getByText(/왕국의 수석 학자/)).toBeTruthy();
  });

  it('story collapses on second tap', () => {
    const { getByText, queryByText } = renderWithProviders(<QuestDetailScreen />);

    // Expand
    fireEvent.press(getByText('펼치기'));
    expect(getByText('접기')).toBeTruthy();

    // Collapse
    fireEvent.press(getByText('접기'));
    expect(getByText('펼치기')).toBeTruthy();
    expect(queryByText(/왕국의 수석 학자/)).toBeNull();
  });

  // --- 5. Shows "퀘스트 포기" button for active quests ---
  it('shows "퀘스트 포기" button for active quests', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    expect(getByText('퀘스트 포기')).toBeTruthy();
  });

  it('hides "퀘스트 포기" button for completed quests', () => {
    mockQuestDetailReturn = {
      data: { ...mockQuest, status: 'COMPLETED' },
      isLoading: false,
    };

    const { queryByText } = renderWithProviders(<QuestDetailScreen />);
    expect(queryByText('퀘스트 포기')).toBeNull();
  });

  it('hides "퀘스트 포기" button for abandoned quests', () => {
    mockQuestDetailReturn = {
      data: { ...mockQuest, status: 'ABANDONED' },
      isLoading: false,
    };

    const { queryByText } = renderWithProviders(<QuestDetailScreen />);
    expect(queryByText('퀘스트 포기')).toBeNull();
  });

  // --- 6. Abandon triggers Alert ---
  it('abandon triggers Alert.alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = renderWithProviders(<QuestDetailScreen />);

    fireEvent.press(getByText('퀘스트 포기'));

    expect(alertSpy).toHaveBeenCalledWith(
      '퀘스트 포기',
      expect.stringContaining('정말'),
      expect.any(Array),
    );

    alertSpy.mockRestore();
  });

  it('abandon shows double confirmation (second Alert on first confirm)', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = renderWithProviders(<QuestDetailScreen />);

    fireEvent.press(getByText('퀘스트 포기'));

    // First alert
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const firstAlertButtons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;

    // Find the destructive "포기할래요" button and press it
    const confirmBtn = firstAlertButtons.find((b) => b.text === '포기할래요');
    expect(confirmBtn).toBeTruthy();
    confirmBtn?.onPress?.();

    // Second alert should appear
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(alertSpy).toHaveBeenLastCalledWith(
      '최종 확인',
      expect.any(String),
      expect.any(Array),
    );

    alertSpy.mockRestore();
  });

  // --- 7. Shows rewards badges (XP, Gold, time) ---
  it('shows rewards badges (XP, Gold, time)', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    expect(getByText('60분')).toBeTruthy();
    expect(getByText('+50 XP')).toBeTruthy();
    expect(getByText('+30 G')).toBeTruthy();
  });

  // --- Additional: displays grade badge ---
  it('displays grade badge', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    expect(getByText('C')).toBeTruthy();
  });

  // --- Additional: displays header ---
  it('displays "퀘스트 상세" header', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    expect(getByText('퀘스트 상세')).toBeTruthy();
  });

  // --- Additional: displays all checkpoint titles ---
  it('displays all checkpoint titles', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    expect(getByText('자료 수집')).toBeTruthy();
    expect(getByText('초안 작성')).toBeTruthy();
    expect(getByText('최종 검토')).toBeTruthy();
  });

  // --- Additional: completed checkpoint shows check mark ---
  it('shows check mark on completed checkpoint', () => {
    const { getAllByText } = renderWithProviders(<QuestDetailScreen />);
    expect(getAllByText('\u2713').length).toBeGreaterThanOrEqual(1);
  });

  // --- Additional: back button ---
  it('back button calls goBack', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    fireEvent.press(getByText('<'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  // --- Additional: checkpoint actions ---
  it('shows action buttons when pending checkpoint tapped', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    fireEvent.press(getByText('최종 검토'));
    expect(getByText('전투 모드로 시작!')).toBeTruthy();
    expect(getByText('그냥 완료 처리')).toBeTruthy();
  });

  it('calls completeCheckpoint mutate on "그냥 완료 처리"', async () => {
    mockCheckpointMutate.mockImplementation((_payload: any, _callbacks: any) => {});

    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    fireEvent.press(getByText('최종 검토'));

    await act(async () => {
      fireEvent.press(getByText('그냥 완료 처리'));
    });

    expect(mockCheckpointMutate).toHaveBeenCalledWith(
      { questId: 1, checkpointId: 12 },
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it('navigates to Battle on "전투 모드로 시작!" tap', () => {
    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    fireEvent.press(getByText('최종 검토'));
    fireEvent.press(getByText('전투 모드로 시작!'));

    expect(mockNavigate).toHaveBeenCalledWith('Battle', {
      screen: 'BattleHome',
      params: { questId: 1, checkpointId: 12 },
    });
  });

  // --- Additional: checkpoint complete error shows alert ---
  it('shows alert on checkpoint complete error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    let capturedCallbacks: { onError?: () => void } = {};

    mockCheckpointMutate.mockImplementation((_payload: any, callbacks: any) => {
      capturedCallbacks = callbacks || {};
    });

    const { getByText } = renderWithProviders(<QuestDetailScreen />);
    fireEvent.press(getByText('최종 검토'));

    await act(async () => {
      fireEvent.press(getByText('그냥 완료 처리'));
    });

    await act(async () => {
      capturedCallbacks.onError?.();
    });

    expect(alertSpy).toHaveBeenCalledWith('실패', expect.any(String));
    alertSpy.mockRestore();
  });

  // --- Quest clear overlay ---
  describe('quest clear overlay', () => {
    it('shows quest clear overlay when all checkpoints completed', async () => {
      jest.useFakeTimers();

      // Two already completed, one pending
      const almostDone: Quest = {
        ...mockQuest,
        checkpoints: [
          { ...mockQuest.checkpoints[0], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[1], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[2], status: 'PENDING' },
        ],
      };

      mockQuestDetailReturn = {
        data: almostDone,
        isLoading: false,
      };

      let capturedCallbacks: { onSuccess?: () => void } = {};
      mockCheckpointMutate.mockImplementation((_payload: any, callbacks: any) => {
        capturedCallbacks = callbacks || {};
      });

      const { getByText } = renderWithProviders(<QuestDetailScreen />);

      // Complete the last checkpoint
      fireEvent.press(getByText('최종 검토'));
      await act(async () => {
        fireEvent.press(getByText('그냥 완료 처리'));
      });

      // Trigger success
      await act(async () => {
        capturedCallbacks.onSuccess?.();
      });

      // Advance timer for the setTimeout(1500)
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(getByText('퀘스트 클리어!')).toBeTruthy();
        expect(getByText('+50')).toBeTruthy();
        expect(getByText('+30')).toBeTruthy();
        expect(getByText('클리어 카드 공유')).toBeTruthy();
        expect(getByText('돌아가기')).toBeTruthy();
      });

      jest.useRealTimers();
    });

    it('navigates back from quest clear screen', async () => {
      jest.useFakeTimers();

      const almostDone: Quest = {
        ...mockQuest,
        checkpoints: [
          { ...mockQuest.checkpoints[0], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[1], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[2], status: 'PENDING' },
        ],
      };

      mockQuestDetailReturn = {
        data: almostDone,
        isLoading: false,
      };

      let capturedCallbacks: { onSuccess?: () => void } = {};
      mockCheckpointMutate.mockImplementation((_payload: any, callbacks: any) => {
        capturedCallbacks = callbacks || {};
      });

      const { getByText } = renderWithProviders(<QuestDetailScreen />);

      fireEvent.press(getByText('최종 검토'));
      await act(async () => {
        fireEvent.press(getByText('그냥 완료 처리'));
      });

      await act(async () => {
        capturedCallbacks.onSuccess?.();
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => getByText('돌아가기'));
      fireEvent.press(getByText('돌아가기'));
      expect(mockGoBack).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });
});
