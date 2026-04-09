import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import QuestDetailScreen from '../QuestDetailScreen';
import { Quest } from '../../../types/quest';

// --- Navigation mock ---
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, getParent: mockGetParent }),
  useRoute: () => ({ params: { questId: 1 } }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(),
}));

// --- Hook mocks ---
const mockCheckpointMutate = jest.fn();

jest.mock('../../../hooks/useQuests', () => ({
  useQuestDetail: jest.fn(),
  useCompleteCheckpoint: jest.fn(() => ({ mutate: mockCheckpointMutate, isPending: false })),
}));

import { useQuestDetail } from '../../../hooks/useQuests';
const mockedUseQuestDetail = useQuestDetail as jest.MockedFunction<typeof useQuestDetail>;

// --- Mock quest detail data ---
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
    {
      id: 10,
      questId: 1,
      orderNum: 1,
      title: '자료 수집',
      estimatedMin: 20,
      expReward: 15,
      goldReward: 10,
      status: 'COMPLETED',
      completedAt: '2026-04-08T10:00:00',
    },
    {
      id: 11,
      questId: 1,
      orderNum: 2,
      title: '초안 작성',
      estimatedMin: 25,
      expReward: 20,
      goldReward: 10,
      status: 'IN_PROGRESS',
    },
    {
      id: 12,
      questId: 1,
      orderNum: 3,
      title: '최종 검토',
      estimatedMin: 15,
      expReward: 15,
      goldReward: 10,
      status: 'PENDING',
    },
  ],
  createdAt: '2026-04-08T00:00:00',
  updatedAt: '2026-04-08T00:00:00',
};

describe('QuestDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseQuestDetail.mockReturnValue({
      data: mockQuest,
      isLoading: false,
    } as any);
  });

  // --- 1. Loading spinner ---
  it('shows loading spinner while fetching', () => {
    mockedUseQuestDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { queryByText } = render(<QuestDetailScreen />);
    // Quest content should not be visible during loading
    expect(queryByText('지식의 두루마리 작성')).toBeNull();
    expect(queryByText('퀘스트 상세')).toBeNull();
  });

  // --- 2. Quest title and original title ---
  it('renders quest title and original title', () => {
    const { getByText } = render(<QuestDetailScreen />);
    expect(getByText('지식의 두루마리 작성')).toBeTruthy();
    expect(getByText('보고서 작성')).toBeTruthy();
  });

  // --- 3. Progress bar with checkpoint count ---
  it('renders progress bar with checkpoint count "X/Y"', () => {
    const { getByText } = render(<QuestDetailScreen />);
    // 1 completed out of 3
    expect(getByText('1/3')).toBeTruthy();
    expect(getByText('진행률')).toBeTruthy();
  });

  it('shows 0/N when no checkpoints completed', () => {
    mockedUseQuestDetail.mockReturnValue({
      data: {
        ...mockQuest,
        checkpoints: mockQuest.checkpoints.map((cp) => ({ ...cp, status: 'PENDING' as const })),
      },
      isLoading: false,
    } as any);

    const { getByText } = render(<QuestDetailScreen />);
    expect(getByText('0/3')).toBeTruthy();
  });

  // --- 4. Collapsible story card ---
  it('renders "퀘스트 스토리" collapsible card', () => {
    const { getByText, queryByText } = render(<QuestDetailScreen />);
    expect(getByText('퀘스트 스토리')).toBeTruthy();
    expect(getByText('펼치기')).toBeTruthy();
    // Story text should be hidden initially
    expect(queryByText(/왕국의 수석 학자/)).toBeNull();
  });

  // --- 5. Tapping story card toggles expansion ---
  it('tapping story card toggles expansion', () => {
    const { getByText, queryByText } = render(<QuestDetailScreen />);

    // Expand
    fireEvent.press(getByText('펼치기'));
    expect(getByText('접기')).toBeTruthy();
    expect(getByText(/왕국의 수석 학자/)).toBeTruthy();

    // Collapse
    fireEvent.press(getByText('접기'));
    expect(getByText('펼치기')).toBeTruthy();
    expect(queryByText(/왕국의 수석 학자/)).toBeNull();
  });

  // --- 6. Reward badges ---
  it('renders reward badges (time, XP, Gold)', () => {
    const { getByText } = render(<QuestDetailScreen />);
    expect(getByText('60분')).toBeTruthy();
    expect(getByText('+50 XP')).toBeTruthy();
    expect(getByText('+30 G')).toBeTruthy();
  });

  // --- 7. Checkpoint list ---
  it('renders checkpoint list', () => {
    const { getByText } = render(<QuestDetailScreen />);
    expect(getByText('체크포인트')).toBeTruthy();
    expect(getByText('자료 수집')).toBeTruthy();
    expect(getByText('초안 작성')).toBeTruthy();
    expect(getByText('최종 검토')).toBeTruthy();
  });

  // --- 8. Abandon button for active quest ---
  it('renders "퀘스트 포기" button for active quest', () => {
    const { getByText } = render(<QuestDetailScreen />);
    expect(getByText('퀘스트 포기')).toBeTruthy();
  });

  it('hides "퀘스트 포기" button for completed quest', () => {
    mockedUseQuestDetail.mockReturnValue({
      data: { ...mockQuest, status: 'COMPLETED' },
      isLoading: false,
    } as any);

    const { queryByText } = render(<QuestDetailScreen />);
    expect(queryByText('퀘스트 포기')).toBeNull();
  });

  it('hides "퀘스트 포기" button for abandoned quest', () => {
    mockedUseQuestDetail.mockReturnValue({
      data: { ...mockQuest, status: 'ABANDONED' },
      isLoading: false,
    } as any);

    const { queryByText } = render(<QuestDetailScreen />);
    expect(queryByText('퀘스트 포기')).toBeNull();
  });

  // --- 9. Double confirmation Alert ---
  it('"퀘스트 포기" shows double confirmation Alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = render(<QuestDetailScreen />);

    fireEvent.press(getByText('퀘스트 포기'));

    // First alert
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy).toHaveBeenCalledWith(
      '퀘스트 포기',
      expect.stringContaining('정말'),
      expect.any(Array),
    );

    // Trigger "포기할래요" from first alert
    const firstButtons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const confirmBtn = firstButtons.find((b) => b.text === '포기할래요');
    expect(confirmBtn).toBeTruthy();
    confirmBtn?.onPress?.();

    // Second alert (최종 확인)
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expect(alertSpy).toHaveBeenLastCalledWith(
      '최종 확인',
      expect.any(String),
      expect.any(Array),
    );

    alertSpy.mockRestore();
  });

  // --- 10. Quest complete overlay ---
  it('quest complete overlay shows "퀘스트 클리어!" with rewards', async () => {
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

    mockedUseQuestDetail.mockReturnValue({
      data: almostDone,
      isLoading: false,
    } as any);

    let capturedCallbacks: { onSuccess?: () => void } = {};
    mockCheckpointMutate.mockImplementation((_payload: any, callbacks: any) => {
      capturedCallbacks = callbacks || {};
    });

    const { getByText } = render(<QuestDetailScreen />);

    // Complete the last checkpoint
    fireEvent.press(getByText('최종 검토'));
    await act(async () => {
      fireEvent.press(getByText('그냥 완료 처리'));
    });

    // Trigger success
    await act(async () => {
      capturedCallbacks.onSuccess?.();
    });

    // Advance timer for setTimeout(1500)
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    await waitFor(() => {
      expect(getByText('퀘스트 클리어!')).toBeTruthy();
      expect(getByText('+50')).toBeTruthy();
      expect(getByText('XP')).toBeTruthy();
      expect(getByText('+30')).toBeTruthy();
      expect(getByText('Gold')).toBeTruthy();
      expect(getByText('클리어 카드 공유')).toBeTruthy();
      expect(getByText('돌아가기')).toBeTruthy();
    });

    jest.useRealTimers();
  });

  // --- Additional tests ---

  it('displays "퀘스트 상세" header', () => {
    const { getByText } = render(<QuestDetailScreen />);
    expect(getByText('퀘스트 상세')).toBeTruthy();
  });

  it('displays grade badge', () => {
    const { getByText } = render(<QuestDetailScreen />);
    expect(getByText('C')).toBeTruthy();
  });

  it('back button calls goBack', () => {
    const { getByText } = render(<QuestDetailScreen />);
    fireEvent.press(getByText('<'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows check mark on completed checkpoint', () => {
    const { getAllByText } = render(<QuestDetailScreen />);
    // Checkmark character rendered for completed checkpoints
    expect(getAllByText('\u2713').length).toBeGreaterThanOrEqual(1);
  });

  it('shows action buttons when pending checkpoint tapped', () => {
    const { getByText } = render(<QuestDetailScreen />);
    fireEvent.press(getByText('최종 검토'));
    expect(getByText('전투 모드로 시작!')).toBeTruthy();
    expect(getByText('그냥 완료 처리')).toBeTruthy();
  });

  it('calls completeCheckpoint mutate on "그냥 완료 처리"', async () => {
    mockCheckpointMutate.mockImplementation(() => {});

    const { getByText } = render(<QuestDetailScreen />);
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
    const { getByText } = render(<QuestDetailScreen />);
    fireEvent.press(getByText('최종 검토'));
    fireEvent.press(getByText('전투 모드로 시작!'));

    expect(mockNavigate).toHaveBeenCalledWith('Battle', {
      screen: 'BattleHome',
      params: { questId: 1, checkpointId: 12 },
    });
  });

  it('shows alert on checkpoint complete error', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    let capturedCallbacks: { onError?: () => void } = {};

    mockCheckpointMutate.mockImplementation((_payload: any, callbacks: any) => {
      capturedCallbacks = callbacks || {};
    });

    const { getByText } = render(<QuestDetailScreen />);
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

    mockedUseQuestDetail.mockReturnValue({
      data: almostDone,
      isLoading: false,
    } as any);

    let capturedCallbacks: { onSuccess?: () => void } = {};
    mockCheckpointMutate.mockImplementation((_payload: any, callbacks: any) => {
      capturedCallbacks = callbacks || {};
    });

    const { getByText } = render(<QuestDetailScreen />);

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
