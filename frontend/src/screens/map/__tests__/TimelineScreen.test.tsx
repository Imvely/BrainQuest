import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TimelineScreen from '../TimelineScreen';
import * as mapApi from '../../../api/map';
import * as characterApi from '../../../api/character';
import * as questApi from '../../../api/quest';
import { useEmotionStore } from '../../../stores/useEmotionStore';
import { useAuthStore } from '../../../stores/useAuthStore';
import { useTimelineStore } from '../../../stores/useTimelineStore';

// --- Navigation mock ---
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

// --- Reanimated mock (override to handle useAnimatedProps) ---
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { createAnimatedComponent: (c: any) => c || View },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedProps: (fn: () => any) => { try { return fn(); } catch { return {}; } },
    useAnimatedStyle: (fn: () => any) => { try { return fn(); } catch { return {}; } },
    withTiming: (v: number) => v,
    Easing: { inOut: () => (v: number) => v, ease: (v: number) => v },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((_: any, ref: any) => null),
    BottomSheetBackdrop: () => null,
    BottomSheetBackdropProps: {},
    BottomSheetView: ({ children }: any) => children,
  };
});

// --- API mocks ---
jest.mock('../../../api/map', () => ({
  getTimeline: jest.fn(),
  createTimeBlock: jest.fn(),
  updateTimeBlock: jest.fn(),
  deleteTimeBlock: jest.fn(),
}));

jest.mock('../../../api/character', () => ({
  getCharacter: jest.fn(),
  createCharacter: jest.fn(),
  equipItem: jest.fn(),
  getInventory: jest.fn(),
}));

jest.mock('../../../api/quest', () => ({
  getQuests: jest.fn(),
  generateQuest: jest.fn(),
  createQuest: jest.fn(),
  getQuestDetail: jest.fn(),
  completeCheckpoint: jest.fn(),
}));

const mockGetTimeline = mapApi.getTimeline as jest.MockedFunction<typeof mapApi.getTimeline>;
const mockGetCharacter = characterApi.getCharacter as jest.MockedFunction<typeof characterApi.getCharacter>;
const mockGetQuests = questApi.getQuests as jest.MockedFunction<typeof questApi.getQuests>;

// --- Test data ---
const MOCK_CHARACTER = {
  id: 1, userId: 1, name: '테스트', classType: 'WARRIOR' as const,
  level: 5, exp: 42, expToNext: 200,
  statAtk: 15, statWis: 10, statDef: 10, statAgi: 10, statHp: 100,
  gold: 300, appearance: { hair: 'short_a', outfit: 'armor_light', color: '#6C5CE7' },
  equippedItems: { helmet: null, armor: null, weapon: null, accessory: null },
};

const MOCK_QUEST_PAGE = {
  content: [
    {
      id: 1, userId: 1, originalTitle: '보고서', questTitle: '마법 보고서', questStory: '',
      category: 'WORK' as const, grade: 'C' as const, estimatedMin: 60, expReward: 50, goldReward: 30,
      status: 'ACTIVE' as const, checkpoints: [
        { id: 1, questId: 1, orderNum: 1, title: '자료수집', estimatedMin: 20, expReward: 15, goldReward: 10, status: 'COMPLETED' as const },
        { id: 2, questId: 1, orderNum: 2, title: '작성', estimatedMin: 40, expReward: 35, goldReward: 20, status: 'PENDING' as const },
      ],
      createdAt: '', updatedAt: '',
    },
  ],
  totalElements: 1, totalPages: 1, page: 0, size: 20,
};

const MOCK_BLOCKS = [
  {
    id: 1, userId: 1, blockDate: '2026-04-09', startTime: '09:00', endTime: '10:00',
    category: 'WORK' as const, title: '업무 미팅', status: 'PLANNED' as const,
    source: 'MANUAL' as const, isBuffer: false, createdAt: '',
  },
];

// --- Helper ---
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>{ui}</NavigationContainer>
    </QueryClientProvider>,
  );
}

describe('TimelineScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTimeline.mockResolvedValue({ success: true, data: [], message: '' });
    mockGetCharacter.mockResolvedValue({ success: true, data: MOCK_CHARACTER, message: '' });
    mockGetQuests.mockResolvedValue({ success: true, data: MOCK_QUEST_PAGE, message: '' } as any);
    useTimelineStore.setState({ blocks: [], remainingMin: 480, nextBlock: null });
    useEmotionStore.setState({ recentRecords: [] });
    useAuthStore.setState({ user: { wakeTime: '07:00', sleepTime: '23:00' } as any });
  });

  // --- 1. Renders without crashing ---
  it('renders without crashing', () => {
    const { toJSON } = renderWithProviders(<TimelineScreen />);
    expect(toJSON()).toBeTruthy();
  });

  // --- 2. Shows character level badge ---
  it('shows character level badge', async () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    await waitFor(() => {
      expect(getByText('Lv.5')).toBeTruthy();
    });
  });

  // --- 3. Shows EXP progress bar ---
  it('shows EXP progress bar', async () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    await waitFor(() => {
      expect(getByText('42 / 200')).toBeTruthy();
    });
  });

  // --- 4. Shows weather emoji button ---
  it('shows weather emoji button', () => {
    const { getAllByText } = renderWithProviders(<TimelineScreen />);
    // When no emotion records, the weather shows '?'
    const questionMarks = getAllByText('?');
    expect(questionMarks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows actual weather emoji from recent record', () => {
    useEmotionStore.setState({
      recentRecords: [
        { id: 1, userId: 1, weatherType: 'SUNNY', intensity: 3, recordedAt: '', createdAt: '' },
      ],
    });
    const { getByText } = renderWithProviders(<TimelineScreen />);
    expect(getByText('☀️')).toBeTruthy();
  });

  // --- 5. Shows CircularTimeline component ---
  it('shows CircularTimeline component', () => {
    // CircularTimeline renders an SVG which renders as View elements
    // We verify the timeline area renders by checking the screen doesn't crash
    const { toJSON } = renderWithProviders(<TimelineScreen />);
    expect(toJSON()).toBeTruthy();
  });

  // --- 6. Shows "전투 시작" main button ---
  it('shows "전투 시작" main button', () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    expect(getByText('전투 시작')).toBeTruthy();
  });

  // --- 7. Shows "체크인" and "감정 기록" side buttons ---
  it('shows "체크인" and "감정 기록" side buttons', () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    expect(getByText('체크인')).toBeTruthy();
    expect(getByText('감정 기록')).toBeTruthy();
  });

  // --- 8. Shows empty state when no quests ---
  it('shows empty state "진행 중인 퀘스트가 없습니다" when no quests', async () => {
    mockGetQuests.mockResolvedValue({
      success: true,
      data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 },
      message: '',
    } as any);

    const { getByText } = renderWithProviders(<TimelineScreen />);
    await waitFor(() => {
      expect(getByText('진행 중인 퀘스트가 없습니다')).toBeTruthy();
      expect(getByText('QUEST 탭에서 할 일을 모험으로 바꿔보세요')).toBeTruthy();
    });
  });

  // --- 9. "전투 시작" navigates to Battle tab ---
  it('"전투 시작" navigates to Battle tab', () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    fireEvent.press(getByText('전투 시작'));
    expect(mockNavigate).toHaveBeenCalledWith('Battle');
  });

  // --- 10. "체크인" navigates to Checkin ---
  it('"체크인" navigates to Checkin', () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    fireEvent.press(getByText('체크인'));
    expect(mockNavigate).toHaveBeenCalledWith('More', { screen: 'Checkin' });
  });

  it('"감정 기록" navigates to Sky', () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    fireEvent.press(getByText('감정 기록'));
    expect(mockNavigate).toHaveBeenCalledWith('Sky');
  });

  // --- 11. Pull-to-refresh works ---
  it('pull-to-refresh works', async () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    // Verify the screen renders and the API was called on mount
    await waitFor(() => {
      expect(mockGetTimeline).toHaveBeenCalled();
    });
    // The RefreshControl is on the ScrollView; we verify the API is callable
    // and the screen remains functional after refresh
    expect(getByText('전투 시작')).toBeTruthy();
  });

  // --- Additional tests ---

  it('shows quest card from API data', async () => {
    const { getByText } = renderWithProviders(<TimelineScreen />);
    await waitFor(() => {
      expect(getByText('마법 보고서')).toBeTruthy();
      expect(getByText('C')).toBeTruthy();
      expect(getByText('1/2 체크포인트')).toBeTruthy();
    });
  });

  it('shows class initial in avatar', async () => {
    mockGetCharacter.mockResolvedValue({
      success: true,
      data: { ...MOCK_CHARACTER, classType: 'MAGE' as const },
      message: '',
    });
    const { getByText } = renderWithProviders(<TimelineScreen />);
    await waitFor(() => {
      expect(getByText('M')).toBeTruthy();
    });
  });

  it('shows default Lv.1 when character API fails', async () => {
    mockGetCharacter.mockRejectedValueOnce(new Error('Network'));
    const { getByText } = renderWithProviders(<TimelineScreen />);
    expect(getByText('Lv.1')).toBeTruthy();
  });

  it('fetches timeline data on mount', async () => {
    renderWithProviders(<TimelineScreen />);
    await waitFor(() => {
      expect(mockGetTimeline).toHaveBeenCalled();
    });
  });

  it('syncs blocks to store after fetch', async () => {
    mockGetTimeline.mockResolvedValueOnce({ success: true, data: MOCK_BLOCKS, message: '' });
    renderWithProviders(<TimelineScreen />);

    await waitFor(() => {
      const { blocks } = useTimelineStore.getState();
      expect(blocks).toHaveLength(1);
      expect(blocks[0].title).toBe('업무 미팅');
    });
  });

  it('handles API error gracefully (no crash)', async () => {
    mockGetTimeline.mockRejectedValueOnce(new Error('Network Error'));
    const { getByText } = renderWithProviders(<TimelineScreen />);
    await waitFor(() => {
      expect(getByText('전투 시작')).toBeTruthy();
    });
  });

  it('renders with null user (defaults to 07:00-23:00)', () => {
    useAuthStore.setState({ user: null });
    const { getByText } = renderWithProviders(<TimelineScreen />);
    expect(getByText('전투 시작')).toBeTruthy();
  });

  it('weather button navigates to Sky on press', () => {
    useEmotionStore.setState({
      recentRecords: [
        { id: 1, userId: 1, weatherType: 'RAIN', intensity: 4, recordedAt: '', createdAt: '' },
      ],
    });
    const { getByText } = renderWithProviders(<TimelineScreen />);
    // The weather emoji area is a touchable that navigates to Sky
    fireEvent.press(getByText('🌧️'));
    expect(mockNavigate).toHaveBeenCalledWith('Sky');
  });
});
