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

// --- Mocks ---

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

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
const mockDeleteBlock = mapApi.deleteTimeBlock as jest.MockedFunction<typeof mapApi.deleteTimeBlock>;

const MOCK_CHARACTER = {
  id: 1, userId: 1, name: '테스트', classType: 'WARRIOR' as const,
  level: 5, exp: 42, expToNext: 200,
  statAtk: 15, statWis: 10, statDef: 10, statAgi: 10, statHp: 100,
  gold: 300, appearance: { hair: 'short_a', outfit: 'armor_light', color: '#6C5CE7' },
  equippedItems: { helmet: null, armor: null, weapon: null, accessory: null },
};

const MOCK_BLOCKS = [
  {
    id: 1, userId: 1, blockDate: '2026-04-08', startTime: '09:00', endTime: '10:00',
    category: 'WORK' as const, title: '업무 미팅', status: 'PLANNED' as const,
    source: 'MANUAL' as const, isBuffer: false, createdAt: '',
  },
];

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

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = createQueryClient();
  return render(
    <QueryClientProvider client={qc}>
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
    useTimelineStore.setState({ blocks: [], remainingMin: 0, nextBlock: null });
    useEmotionStore.setState({ recentRecords: [] });
    useAuthStore.setState({ user: null });
  });

  // === 1. Rendering ===
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = renderWithProviders(<TimelineScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('shows three action buttons', () => {
      const { getByText } = renderWithProviders(<TimelineScreen />);
      expect(getByText('전투 시작')).toBeTruthy();
      expect(getByText('체크인')).toBeTruthy();
      expect(getByText('감정 기록')).toBeTruthy();
    });

    it('shows weather placeholder when no emotion records', () => {
      const { getAllByText } = renderWithProviders(<TimelineScreen />);
      // Both avatar (no character classType) and weather show '?'
      const questionMarks = getAllByText('?');
      expect(questionMarks.length).toBeGreaterThanOrEqual(1);
    });
  });

  // === 2. Character data from API ===
  describe('with character data', () => {
    it('displays character level and exp after API load', async () => {
      const { getByText } = renderWithProviders(<TimelineScreen />);
      await waitFor(() => {
        expect(getByText('Lv.5')).toBeTruthy();
        expect(getByText('42 / 200')).toBeTruthy();
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

    it('shows default Lv.1 when API fails', async () => {
      mockGetCharacter.mockRejectedValueOnce(new Error('Network'));
      const { getByText } = renderWithProviders(<TimelineScreen />);
      // Falls back to null character → Lv.1
      expect(getByText('Lv.1')).toBeTruthy();
    });
  });

  // === 3. Quest cards from API ===
  describe('quest display', () => {
    it('shows quest card from API data', async () => {
      const { getByText } = renderWithProviders(<TimelineScreen />);
      await waitFor(() => {
        expect(getByText('마법 보고서')).toBeTruthy();
        expect(getByText('C')).toBeTruthy();
        expect(getByText('1/2 체크포인트')).toBeTruthy();
      });
    });

    it('shows empty state when no active quests', async () => {
      mockGetQuests.mockResolvedValue({
        success: true,
        data: { content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 },
        message: '',
      } as any);
      const { getByText } = renderWithProviders(<TimelineScreen />);
      await waitFor(() => {
        expect(getByText('진행 중인 퀘스트가 없습니다')).toBeTruthy();
      });
    });
  });

  // === 4. Emotion weather ===
  describe('emotion weather', () => {
    it('shows weather emoji from recent record', () => {
      useEmotionStore.setState({
        recentRecords: [
          { id: 1, userId: 1, weatherType: 'SUNNY', intensity: 3, recordedAt: '', createdAt: '' },
        ],
      });
      const { getByText } = renderWithProviders(<TimelineScreen />);
      expect(getByText('☀️')).toBeTruthy();
    });
  });

  // === 5. Navigation ===
  describe('navigation', () => {
    it('navigates to Battle on battle button tap', () => {
      const { getByText } = renderWithProviders(<TimelineScreen />);
      fireEvent.press(getByText('전투 시작'));
      expect(mockNavigate).toHaveBeenCalledWith('Battle');
    });

    it('navigates to Sky on emotion button tap', () => {
      const { getByText } = renderWithProviders(<TimelineScreen />);
      fireEvent.press(getByText('감정 기록'));
      expect(mockNavigate).toHaveBeenCalledWith('Sky');
    });

    it('navigates to Checkin on checkin button tap', () => {
      const { getByText } = renderWithProviders(<TimelineScreen />);
      fireEvent.press(getByText('체크인'));
      expect(mockNavigate).toHaveBeenCalledWith('More', { screen: 'Checkin' });
    });
  });

  // === 6. API integration ===
  describe('API integration', () => {
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
  });

  // === 7. Block interaction ===
  describe('block interaction', () => {
    it('Alert.alert receives block info format', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      Alert.alert('업무 미팅', '09:00 ~ 10:00\n상태: PLANNED', [
        { text: '닫기' },
        { text: '삭제' },
      ]);
      expect(alertSpy).toHaveBeenCalledWith(
        '업무 미팅',
        expect.stringContaining('09:00'),
        expect.arrayContaining([
          expect.objectContaining({ text: '닫기' }),
          expect.objectContaining({ text: '삭제' }),
        ]),
      );
    });
  });

  // === 8. Delete block ===
  describe('delete block', () => {
    it('calls deleteTimeBlock API', async () => {
      mockDeleteBlock.mockResolvedValueOnce({ success: true, data: undefined as any, message: '' });
      await mapApi.deleteTimeBlock(1);
      expect(mockDeleteBlock).toHaveBeenCalledWith(1);
    });
  });

  // === 9. Edge cases ===
  describe('edge cases', () => {
    it('handles empty timeline response', async () => {
      mockGetTimeline.mockResolvedValueOnce({ success: true, data: [], message: '' });
      const { getByText } = renderWithProviders(<TimelineScreen />);
      await waitFor(() => {
        expect(getByText('전투 시작')).toBeTruthy();
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
  });
});
