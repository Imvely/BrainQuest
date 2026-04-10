import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useQuests,
  useQuestDetail,
  useGenerateQuest,
  useCreateQuest,
  useCompleteCheckpoint,
} from '../useQuests';
import * as questApi from '../../api/quest';
import type { Quest, QuestGenerateResponse, Checkpoint } from '../../types/quest';
import type { ApiResponse, PageResponse } from '../../types/api';

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

jest.mock('../../api/quest');
const mockApi = questApi as jest.Mocked<typeof questApi>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

/** Create a wrapper that exposes the QueryClient for spy assertions. */
function createSpyWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  const spy = jest.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
  return { wrapper, spy, qc };
}

const CHECKPOINT_FIXTURE: Checkpoint = {
  id: 10,
  questId: 1,
  orderNum: 1,
  title: '접시 물에 담그기',
  estimatedMin: 5,
  expReward: 5,
  goldReward: 3,
  status: 'PENDING',
};

const QUEST_FIXTURE: Quest = {
  id: 1,
  userId: 1,
  originalTitle: '설거지',
  questTitle: '반짝이는 접시의 전장',
  questStory: '주방의 어둠 속에서 접시 괴물이 쌓여간다...',
  category: 'HOME',
  grade: 'E',
  estimatedMin: 10,
  expReward: 10,
  goldReward: 5,
  status: 'ACTIVE',
  checkpoints: [CHECKPOINT_FIXTURE],
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-01T00:00:00Z',
};

const SECOND_QUEST_FIXTURE: Quest = {
  ...QUEST_FIXTURE,
  id: 2,
  originalTitle: '보고서 작성',
  questTitle: '학자의 두루마리 임무',
  category: 'WORK',
  grade: 'C',
  estimatedMin: 60,
  expReward: 50,
  goldReward: 30,
  status: 'IN_PROGRESS',
  checkpoints: [],
};

const PAGE_RESPONSE: PageResponse<Quest> = {
  content: [QUEST_FIXTURE, SECOND_QUEST_FIXTURE],
  totalElements: 2,
  totalPages: 1,
  page: 0,
  size: 20,
};

const GENERATED_RESPONSE: QuestGenerateResponse = {
  questTitle: '모험의 시작',
  questStory: '새로운 세계가 열린다',
  grade: 'D',
  estimatedMin: 20,
  expReward: 25,
  goldReward: 15,
  checkpoints: [
    { orderNum: 1, title: '첫 번째 관문', estimatedMin: 10, expReward: 10, goldReward: 5 },
    { orderNum: 2, title: '두 번째 관문', estimatedMin: 10, expReward: 15, goldReward: 10 },
  ],
};

function apiOk<T>(data: T): ApiResponse<T> {
  return { success: true, data, message: '' };
}

// ---------------------------------------------------------------------------
// Tests — useQuests
// ---------------------------------------------------------------------------

describe('useQuests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches quest list and applies select transform to extract data', async () => {
    mockApi.getQuests.mockResolvedValueOnce(apiOk(PAGE_RESPONSE));

    const { result } = renderHook(() => useQuests(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // select: (res) => res.data — should unwrap ApiResponse and return PageResponse directly
    expect(result.current.data).toBeDefined();
    expect(result.current.data?.content).toHaveLength(2);
    expect(result.current.data?.content[0].questTitle).toBe('반짝이는 접시의 전장');
    expect(result.current.data?.content[1].category).toBe('WORK');
    expect(result.current.data?.totalElements).toBe(2);
  });

  it('returns undefined data while loading', async () => {
    // Never-resolving promise keeps the hook in loading state
    mockApi.getQuests.mockReturnValueOnce(new Promise(() => {}));

    const { result } = renderHook(() => useQuests(), { wrapper: createWrapper() });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.isSuccess).toBe(false);
  });

  it('passes status and category params to the API call', async () => {
    mockApi.getQuests.mockResolvedValueOnce(
      apiOk({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 }),
    );

    renderHook(() => useQuests({ status: 'COMPLETED', category: 'HEALTH' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockApi.getQuests).toHaveBeenCalledWith({ status: 'COMPLETED', category: 'HEALTH' }),
    );
  });

  it('propagates API rejection as an error state', async () => {
    mockApi.getQuests.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useQuests(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Network failure');
    expect(result.current.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — useQuestDetail
// ---------------------------------------------------------------------------

describe('useQuestDetail', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches a single quest by id and applies select', async () => {
    mockApi.getQuestDetail.mockResolvedValueOnce(apiOk(QUEST_FIXTURE));

    const { result } = renderHook(() => useQuestDetail(1), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.id).toBe(1);
    expect(result.current.data?.questTitle).toBe('반짝이는 접시의 전장');
    expect(result.current.data?.checkpoints).toHaveLength(1);
    expect(mockApi.getQuestDetail).toHaveBeenCalledWith(1);
  });

  it('is disabled when id is 0 (enabled: id > 0)', async () => {
    renderHook(() => useQuestDetail(0), { wrapper: createWrapper() });

    // Wait briefly to confirm no call is made
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.getQuestDetail).not.toHaveBeenCalled();
  });

  it('is disabled when id is negative', async () => {
    const { result } = renderHook(() => useQuestDetail(-1), { wrapper: createWrapper() });

    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.getQuestDetail).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('propagates API error for quest detail', async () => {
    mockApi.getQuestDetail.mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useQuestDetail(999), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Not found');
  });
});

// ---------------------------------------------------------------------------
// Tests — useGenerateQuest
// ---------------------------------------------------------------------------

describe('useGenerateQuest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls generateQuest API and returns generated data', async () => {
    mockApi.generateQuest.mockResolvedValueOnce(apiOk(GENERATED_RESPONSE));

    const { result } = renderHook(() => useGenerateQuest(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ originalTitle: '빨래하기', category: 'HOME', estimatedMin: 20 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.generateQuest).toHaveBeenCalledWith({
      originalTitle: '빨래하기',
      category: 'HOME',
      estimatedMin: 20,
    });
    expect(result.current.data?.data.questTitle).toBe('모험의 시작');
    expect(result.current.data?.data.checkpoints).toHaveLength(2);
  });

  it('propagates generation failure', async () => {
    mockApi.generateQuest.mockRejectedValueOnce(new Error('AI service unavailable'));

    const { result } = renderHook(() => useGenerateQuest(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ originalTitle: '운동', category: 'HEALTH' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('AI service unavailable');
  });
});

// ---------------------------------------------------------------------------
// Tests — useCreateQuest
// ---------------------------------------------------------------------------

describe('useCreateQuest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls createQuest API and invalidates quests cache on success', async () => {
    mockApi.createQuest.mockResolvedValueOnce(apiOk(QUEST_FIXTURE));

    const { wrapper, spy } = createSpyWrapper();
    const { result } = renderHook(() => useCreateQuest(), { wrapper });

    const createPayload = {
      ...GENERATED_RESPONSE,
      originalTitle: '빨래하기',
      category: 'HOME' as const,
    };

    await act(async () => {
      result.current.mutate(createPayload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.createQuest).toHaveBeenCalledWith(createPayload);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['quests'] });
  });

  it('does not invalidate cache when creation fails', async () => {
    mockApi.createQuest.mockRejectedValueOnce(new Error('Validation error'));

    const { wrapper, spy } = createSpyWrapper();
    const { result } = renderHook(() => useCreateQuest(), { wrapper });

    await act(async () => {
      result.current.mutate({
        ...GENERATED_RESPONSE,
        originalTitle: '',
        category: 'WORK' as const,
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests — useCompleteCheckpoint
// ---------------------------------------------------------------------------

describe('useCompleteCheckpoint', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls completeCheckpoint API with correct questId and checkpointId', async () => {
    mockApi.completeCheckpoint.mockResolvedValueOnce(apiOk(undefined as any));

    const { result } = renderHook(() => useCompleteCheckpoint(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ questId: 1, checkpointId: 10 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.completeCheckpoint).toHaveBeenCalledWith(1, 10);
  });

  it('invalidates quest detail, quests list, and character caches on success', async () => {
    mockApi.completeCheckpoint.mockResolvedValueOnce(apiOk(undefined as any));

    const { wrapper, spy } = createSpyWrapper();
    const { result } = renderHook(() => useCompleteCheckpoint(), { wrapper });

    await act(async () => {
      result.current.mutate({ questId: 5, checkpointId: 42 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify all three cache invalidations, including the dynamic questId
    expect(spy).toHaveBeenCalledWith({ queryKey: ['quest', 5] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['quests'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['character'] });
    expect(spy).toHaveBeenCalledTimes(3);
  });

  it('does not invalidate caches when checkpoint completion fails', async () => {
    mockApi.completeCheckpoint.mockRejectedValueOnce(new Error('Server error'));

    const { wrapper, spy } = createSpyWrapper();
    const { result } = renderHook(() => useCompleteCheckpoint(), { wrapper });

    await act(async () => {
      result.current.mutate({ questId: 1, checkpointId: 10 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(spy).not.toHaveBeenCalled();
  });
});
