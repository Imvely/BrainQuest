import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuestDetailScreen from '../QuestDetailScreen';
import * as questApi from '../../../api/quest';
import { Quest } from '../../../types/quest';

// --- Mocks ---
const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockNavigate }));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack, getParent: mockGetParent }),
  useRoute: () => ({ params: { questId: 1 } }),
}));

jest.mock('../../../api/quest', () => ({
  getQuestDetail: jest.fn(),
  completeCheckpoint: jest.fn(),
}));

const mockGetQuestDetail = questApi.getQuestDetail as jest.MockedFunction<typeof questApi.getQuestDetail>;
const mockCompleteCheckpoint = questApi.completeCheckpoint as jest.MockedFunction<typeof questApi.completeCheckpoint>;

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
    mockGetQuestDetail.mockResolvedValue({
      success: true,
      data: mockQuest,
      message: '',
    });
  });

  // --- 1. Loading state ---
  describe('loading state', () => {
    it('shows loading indicator while fetching', () => {
      mockGetQuestDetail.mockReturnValue(new Promise(() => {}));
      const { toJSON } = renderWithProviders(<QuestDetailScreen />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // --- 2. Rendering ---
  describe('rendering', () => {
    it('renders without crashing', async () => {
      const { toJSON } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(toJSON()).toBeTruthy());
    });

    it('displays header', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(getByText('퀘스트 상세')).toBeTruthy());
    });

    it('displays quest title', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(getByText('지식의 두루마리 작성')).toBeTruthy());
    });

    it('displays original title', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(getByText('보고서 작성')).toBeTruthy());
    });

    it('displays grade badge', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(getByText('C')).toBeTruthy());
    });

    it('displays progress count', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(getByText('1/3')).toBeTruthy());
    });

    it('displays reward badges', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => {
        expect(getByText('60분')).toBeTruthy();
        expect(getByText('+50 XP')).toBeTruthy();
        expect(getByText('+30 G')).toBeTruthy();
      });
    });

    it('displays checkpoint titles', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => {
        expect(getByText('자료 수집')).toBeTruthy();
        expect(getByText('초안 작성')).toBeTruthy();
        expect(getByText('최종 검토')).toBeTruthy();
      });
    });

    it('shows completed checkpoint with check mark', async () => {
      const { getAllByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => {
        expect(getAllByText('✓').length).toBeGreaterThanOrEqual(1);
      });
    });

    it('shows abandon button for active quest', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(getByText('퀘스트 포기')).toBeTruthy());
    });
  });

  // --- 3. Story collapse/expand ---
  describe('story card', () => {
    it('shows story label', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(getByText('퀘스트 스토리')).toBeTruthy());
    });

    it('shows expand toggle', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => expect(getByText('펼치기')).toBeTruthy());
    });

    it('expands story on tap', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('펼치기'));
      fireEvent.press(getByText('펼치기'));
      await waitFor(() => {
        expect(getByText('접기')).toBeTruthy();
        expect(getByText(/왕국의 수석 학자/)).toBeTruthy();
      });
    });

    it('collapses story on second tap', async () => {
      const { getByText, queryByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('펼치기'));
      fireEvent.press(getByText('펼치기'));
      await waitFor(() => getByText('접기'));
      fireEvent.press(getByText('접기'));
      await waitFor(() => {
        expect(getByText('펼치기')).toBeTruthy();
        expect(queryByText(/왕국의 수석 학자/)).toBeNull();
      });
    });
  });

  // --- 4. Checkpoint completion ---
  describe('checkpoint completion', () => {
    it('shows action buttons when pending checkpoint tapped', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('최종 검토'));
      fireEvent.press(getByText('최종 검토'));
      expect(getByText('전투 모드로 시작!')).toBeTruthy();
      expect(getByText('그냥 완료 처리')).toBeTruthy();
    });

    it('calls completeCheckpoint API on "그냥 완료"', async () => {
      mockCompleteCheckpoint.mockResolvedValue({ success: true, data: undefined, message: '' });

      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('최종 검토'));
      fireEvent.press(getByText('최종 검토'));

      await act(async () => {
        fireEvent.press(getByText('그냥 완료 처리'));
      });

      await waitFor(() => {
        expect(mockCompleteCheckpoint).toHaveBeenCalledWith(1, 12);
      });
    });

    it('navigates to Battle on "전투 모드" tap', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('최종 검토'));
      fireEvent.press(getByText('최종 검토'));
      fireEvent.press(getByText('전투 모드로 시작!'));

      expect(mockNavigate).toHaveBeenCalledWith('Battle', {
        screen: 'BattleHome',
        params: { questId: 1, checkpointId: 12 },
      });
    });
  });

  // --- 5. Quest abandon ---
  describe('quest abandon', () => {
    it('shows confirmation dialog on abandon press', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('퀘스트 포기'));
      fireEvent.press(getByText('퀘스트 포기'));

      expect(alertSpy).toHaveBeenCalledWith(
        '퀘스트 포기',
        expect.stringContaining('정말'),
        expect.any(Array),
      );
      alertSpy.mockRestore();
    });
  });

  // --- 6. Back navigation ---
  describe('navigation', () => {
    it('goes back on back button press', async () => {
      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('<'));
      fireEvent.press(getByText('<'));
      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  // --- 7. Completed quest ---
  describe('completed quest', () => {
    it('hides abandon button for completed quest', async () => {
      mockGetQuestDetail.mockResolvedValue({
        success: true,
        data: { ...mockQuest, status: 'COMPLETED' },
        message: '',
      });

      const { queryByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => {
        expect(queryByText('퀘스트 포기')).toBeNull();
      });
    });
  });

  // --- 8. Error handling ---
  describe('error handling', () => {
    it('shows alert on checkpoint complete failure', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockCompleteCheckpoint.mockRejectedValue(new Error('fail'));

      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('최종 검토'));
      fireEvent.press(getByText('최종 검토'));

      await act(async () => {
        fireEvent.press(getByText('그냥 완료 처리'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('실패', expect.any(String));
      });

      alertSpy.mockRestore();
    });
  });

  // --- 9. All checkpoints complete → quest clear screen ---
  describe('quest clear', () => {
    it('shows quest clear overlay when all checkpoints completed', async () => {
      jest.useFakeTimers();

      // All checkpoints completed except last one
      const almostDone: Quest = {
        ...mockQuest,
        checkpoints: [
          { ...mockQuest.checkpoints[0], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[1], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[2], status: 'PENDING' },
        ],
      };

      mockGetQuestDetail.mockResolvedValue({
        success: true,
        data: almostDone,
        message: '',
      });
      mockCompleteCheckpoint.mockResolvedValue({ success: true, data: undefined, message: '' });

      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('최종 검토'));

      // Complete the last checkpoint
      fireEvent.press(getByText('최종 검토'));
      await act(async () => {
        fireEvent.press(getByText('그냥 완료 처리'));
      });

      // Wait for the setTimeout that triggers quest complete
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(getByText('퀘스트 클리어!')).toBeTruthy();
        expect(getByText('+50')).toBeTruthy();
        expect(getByText('+30')).toBeTruthy();
      });

      jest.useRealTimers();
    });

    it('shows share and done buttons on clear screen', async () => {
      jest.useFakeTimers();

      const almostDone: Quest = {
        ...mockQuest,
        checkpoints: [
          { ...mockQuest.checkpoints[0], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[1], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[2], status: 'PENDING' },
        ],
      };

      mockGetQuestDetail.mockResolvedValue({
        success: true,
        data: almostDone,
        message: '',
      });
      mockCompleteCheckpoint.mockResolvedValue({ success: true, data: undefined, message: '' });

      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('최종 검토'));

      fireEvent.press(getByText('최종 검토'));
      await act(async () => {
        fireEvent.press(getByText('그냥 완료 처리'));
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(getByText('클리어 카드 공유')).toBeTruthy();
        expect(getByText('돌아가기')).toBeTruthy();
      });

      jest.useRealTimers();
    });

    it('navigates back from clear screen', async () => {
      jest.useFakeTimers();

      const almostDone: Quest = {
        ...mockQuest,
        checkpoints: [
          { ...mockQuest.checkpoints[0], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[1], status: 'COMPLETED' },
          { ...mockQuest.checkpoints[2], status: 'PENDING' },
        ],
      };

      mockGetQuestDetail.mockResolvedValue({
        success: true,
        data: almostDone,
        message: '',
      });
      mockCompleteCheckpoint.mockResolvedValue({ success: true, data: undefined, message: '' });

      const { getByText } = renderWithProviders(<QuestDetailScreen />);
      await waitFor(() => getByText('최종 검토'));

      fireEvent.press(getByText('최종 검토'));
      await act(async () => {
        fireEvent.press(getByText('그냥 완료 처리'));
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
