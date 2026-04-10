import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useStartBattle,
  useEndBattle,
  useRecordExit,
  useRecordReturn,
  useBattleHistory,
} from '../useBattle';
import * as battleApi from '../../api/battle';

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

jest.mock('../../api/battle');
const mockApi = battleApi as jest.Mocked<typeof battleApi>;

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

/**
 * Create a wrapper with an explicit QueryClient so we can spy on
 * invalidateQueries for cache-invalidation assertions.
 */
function createWrapperWithClient() {
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

const SESSION_FIXTURE = {
  id: 42,
  userId: 1,
  questId: 10,
  checkpointId: 3,
  plannedMin: 25,
  actualMin: undefined,
  monsterType: 'SLIME',
  monsterMaxHp: 300,
  monsterRemainingHp: 300,
  maxCombo: 0,
  exitCount: 0,
  totalExitSec: 0,
  result: undefined,
  expEarned: 0,
  goldEarned: 0,
  itemDrops: [],
  startedAt: '2026-04-10T09:00:00Z',
  endedAt: undefined,
};

const END_RESPONSE_FIXTURE = {
  expEarned: 50,
  goldEarned: 30,
  itemDrops: [{ itemId: 7, name: 'Bronze Sword', rarity: 'COMMON' }],
  levelUp: false,
  newLevel: undefined,
  checkpointCompleted: true,
};

const EXIT_RESPONSE_FIXTURE = {
  penaltyType: 'COMBO_RESET' as const,
  monsterRemainingHp: 280,
};

const RETURN_RESPONSE_FIXTURE = {
  penaltyType: 'COMBO_RESET' as const,
  monsterRemainingHp: 280,
  remainingSeconds: 1200,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useStartBattle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls startBattle API with the correct request', async () => {
    mockApi.startBattle.mockResolvedValueOnce({
      success: true,
      data: SESSION_FIXTURE as any,
      message: '',
    });

    const { result } = renderHook(() => useStartBattle(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ questId: 10, checkpointId: 3, plannedMin: 25 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.startBattle).toHaveBeenCalledWith({
      questId: 10,
      checkpointId: 3,
      plannedMin: 25,
    });
    expect(result.current.data?.data.id).toBe(42);
  });

  it('works without optional questId and checkpointId', async () => {
    mockApi.startBattle.mockResolvedValueOnce({
      success: true,
      data: { ...SESSION_FIXTURE, questId: undefined, checkpointId: undefined } as any,
      message: '',
    });

    const { result } = renderHook(() => useStartBattle(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ plannedMin: 15 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.startBattle).toHaveBeenCalledWith({ plannedMin: 15 });
  });

  it('propagates API error', async () => {
    mockApi.startBattle.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStartBattle(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ plannedMin: 25 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Network error');
  });
});

describe('useEndBattle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls endBattle API with sessionId and request', async () => {
    mockApi.endBattle.mockResolvedValueOnce({
      success: true,
      data: END_RESPONSE_FIXTURE as any,
      message: '',
    });

    const { result } = renderHook(() => useEndBattle(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        sessionId: 42,
        request: { result: 'VICTORY', maxCombo: 5 },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.endBattle).toHaveBeenCalledWith(42, {
      result: 'VICTORY',
      maxCombo: 5,
    });
  });

  it('invalidates battleHistory, character, quests, and timeline caches on success', async () => {
    mockApi.endBattle.mockResolvedValueOnce({
      success: true,
      data: END_RESPONSE_FIXTURE as any,
      message: '',
    });

    const { wrapper, spy } = createWrapperWithClient();
    const { result } = renderHook(() => useEndBattle(), { wrapper });

    await act(async () => {
      result.current.mutate({
        sessionId: 42,
        request: { result: 'VICTORY', maxCombo: 3 },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith({ queryKey: ['battleHistory'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['character'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['quests'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
  });

  it('does not invalidate caches on failure', async () => {
    mockApi.endBattle.mockRejectedValueOnce(new Error('Server error'));

    const { wrapper, spy } = createWrapperWithClient();
    const { result } = renderHook(() => useEndBattle(), { wrapper });

    await act(async () => {
      result.current.mutate({
        sessionId: 42,
        request: { result: 'DEFEAT', maxCombo: 0 },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('useRecordExit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls recordExit API with the correct sessionId', async () => {
    mockApi.recordExit.mockResolvedValueOnce({
      success: true,
      data: EXIT_RESPONSE_FIXTURE,
      message: '',
    });

    const { result } = renderHook(() => useRecordExit(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(42);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.recordExit).toHaveBeenCalledWith(42);
    expect(result.current.data?.data.penaltyType).toBe('COMBO_RESET');
  });

  it('propagates API error', async () => {
    mockApi.recordExit.mockRejectedValueOnce(new Error('Exit failed'));

    const { result } = renderHook(() => useRecordExit(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(99);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Exit failed');
  });
});

describe('useRecordReturn', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls recordReturn API with the correct sessionId', async () => {
    mockApi.recordReturn.mockResolvedValueOnce({
      success: true,
      data: RETURN_RESPONSE_FIXTURE,
      message: '',
    });

    const { result } = renderHook(() => useRecordReturn(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(42);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.recordReturn).toHaveBeenCalledWith(42);
    expect(result.current.data?.data.remainingSeconds).toBe(1200);
  });

  it('propagates API error', async () => {
    mockApi.recordReturn.mockRejectedValueOnce(new Error('Return failed'));

    const { result } = renderHook(() => useRecordReturn(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate(7);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Return failed');
  });
});

describe('useBattleHistory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches battle history and applies select to unwrap data', async () => {
    mockApi.getBattleHistory.mockResolvedValueOnce({
      success: true,
      data: [SESSION_FIXTURE as any],
      message: '',
    });

    const { result } = renderHook(() => useBattleHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // select: res => res.data means the hook returns the inner data array
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].monsterType).toBe('SLIME');
  });

  it('passes pagination params to the API', async () => {
    mockApi.getBattleHistory.mockResolvedValueOnce({
      success: true,
      data: [],
      message: '',
    });

    renderHook(() => useBattleHistory({ page: 2, size: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() =>
      expect(mockApi.getBattleHistory).toHaveBeenCalledWith({ page: 2, size: 10 }),
    );
  });

  it('includes params in the query key for proper caching', async () => {
    mockApi.getBattleHistory.mockResolvedValue({
      success: true,
      data: [],
      message: '',
    });

    const wrapper = createWrapper();

    const { result: r1 } = renderHook(() => useBattleHistory({ page: 0 }), { wrapper });
    const { result: r2 } = renderHook(() => useBattleHistory({ page: 1 }), { wrapper });

    await waitFor(() => expect(r1.current.isSuccess).toBe(true));
    await waitFor(() => expect(r2.current.isSuccess).toBe(true));

    // Two different param objects should trigger two separate API calls
    expect(mockApi.getBattleHistory).toHaveBeenCalledTimes(2);
  });

  it('handles API error gracefully', async () => {
    mockApi.getBattleHistory.mockRejectedValueOnce(new Error('Network'));

    const { result } = renderHook(() => useBattleHistory(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
