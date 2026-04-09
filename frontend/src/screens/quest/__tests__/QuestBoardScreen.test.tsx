import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QuestBoardScreen from '../QuestBoardScreen';
import * as questApi from '../../../api/quest';
import { Quest } from '../../../types/quest';

// --- Mocks ---
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

jest.mock('../../../api/quest', () => ({
  getQuests: jest.fn(),
}));

const mockGetQuests = questApi.getQuests as jest.MockedFunction<typeof questApi.getQuests>;

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

const questList = [
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
    mockGetQuests.mockResolvedValue({
      success: true,
      data: { content: questList, totalElements: 3, totalPages: 1, page: 0, size: 20 },
      message: '',
    });
  });

  // --- 1. Rendering ---
  describe('rendering', () => {
    it('renders without crashing', async () => {
      const { toJSON } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => expect(toJSON()).toBeTruthy());
    });

    it('displays header title', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => expect(getByText('퀘스트 보드')).toBeTruthy());
    });

    it('displays category filter chips', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => {
        expect(getByText('전체')).toBeTruthy();
        expect(getByText('업무')).toBeTruthy();
        expect(getByText('가사')).toBeTruthy();
        expect(getByText('건강')).toBeTruthy();
        expect(getByText('사회')).toBeTruthy();
        expect(getByText('자기관리')).toBeTruthy();
      });
    });

    it('displays quest cards when data loaded', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => {
        expect(getByText('슬라임 토벌')).toBeTruthy();
        expect(getByText('지식의 두루마리 작성')).toBeTruthy();
        expect(getByText('전설의 던전 공략')).toBeTruthy();
      });
    });

    it('displays active quest count', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => expect(getByText('3개 진행중')).toBeTruthy());
    });

    it('shows E-grade recommendation banner', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() =>
        expect(getByText(/E급 슬라임 퀘스트부터 시작하세요/)).toBeTruthy(),
      );
    });

    it('shows FAB button', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => expect(getByText('+')).toBeTruthy());
    });
  });

  // --- 2. Empty state ---
  describe('empty state', () => {
    beforeEach(() => {
      mockGetQuests.mockResolvedValue({
        success: true,
        data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 },
        message: '',
      });
    });

    it('shows empty state message', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => {
        expect(getByText('모험이 기다리고 있어요!')).toBeTruthy();
        expect(getByText('할 일을 RPG 퀘스트로 바꿔보세요')).toBeTruthy();
      });
    });

    it('shows "첫 퀘스트 만들기" button', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => expect(getByText('첫 퀘스트 만들기')).toBeTruthy());
    });

    it('navigates to QuestCreate on empty button press', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => getByText('첫 퀘스트 만들기'));
      fireEvent.press(getByText('첫 퀘스트 만들기'));
      expect(mockNavigate).toHaveBeenCalledWith('QuestCreate');
    });
  });

  // --- 3. Category filter interaction ---
  describe('category filter', () => {
    it('calls API with category when filter chip tapped', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => getByText('업무'));
      fireEvent.press(getByText('업무'));

      await waitFor(() =>
        expect(mockGetQuests).toHaveBeenCalledWith(
          expect.objectContaining({ category: 'WORK' }),
        ),
      );
    });

    it('calls API without category when "전체" tapped', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => getByText('업무'));

      // Switch to 업무
      fireEvent.press(getByText('업무'));
      // Switch back to 전체
      fireEvent.press(getByText('전체'));

      await waitFor(() =>
        expect(mockGetQuests).toHaveBeenCalledWith(
          expect.objectContaining({ category: undefined }),
        ),
      );
    });
  });

  // --- 4. Navigation ---
  describe('navigation', () => {
    it('navigates to QuestCreate when FAB pressed', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => getByText('+'));
      fireEvent.press(getByText('+'));
      expect(mockNavigate).toHaveBeenCalledWith('QuestCreate');
    });

    it('navigates to QuestDetail when quest card tapped', async () => {
      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => getByText('슬라임 토벌'));
      fireEvent.press(getByText('슬라임 토벌'));
      expect(mockNavigate).toHaveBeenCalledWith('QuestDetail', { questId: 1 });
    });
  });

  // --- 5. Loading state ---
  describe('loading state', () => {
    it('shows loading indicator initially', () => {
      mockGetQuests.mockReturnValue(new Promise(() => {})); // never resolves
      const { toJSON } = renderWithProviders(<QuestBoardScreen />);
      expect(toJSON()).toBeTruthy();
    });
  });

  // --- 6. Completed quests ---
  describe('completed quests', () => {
    it('shows CLEAR stamp on completed quests', async () => {
      mockGetQuests.mockResolvedValue({
        success: true,
        data: {
          content: [makeQuest({ id: 10, status: 'COMPLETED', questTitle: '완료된 퀘스트' })],
          totalElements: 1,
          totalPages: 1,
          page: 0,
          size: 20,
        },
        message: '',
      });

      const { getByText } = renderWithProviders(<QuestBoardScreen />);
      await waitFor(() => {
        expect(getByText('완료된 퀘스트')).toBeTruthy();
        expect(getByText('CLEAR')).toBeTruthy();
      });
    });
  });
});
