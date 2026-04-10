import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useTimeline,
  useCreateTimeBlock,
  useUpdateTimeBlock,
  useDeleteTimeBlock,
} from '../useTimeline';
import * as mapApi from '../../api/map';
import { TimeBlock } from '../../types/timeline';

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

jest.mock('../../api/map');
const mockApi = mapApi as jest.Mocked<typeof mapApi>;

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
 * Create a wrapper that exposes its QueryClient so tests can spy on
 * invalidateQueries.
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
  return { wrapper, qc, spy };
}

const BLOCK_FIXTURE: TimeBlock = {
  id: 1,
  userId: 1,
  blockDate: '2026-04-10',
  startTime: '09:00',
  endTime: '10:00',
  category: 'WORK',
  title: 'Morning focus',
  status: 'PLANNED',
  source: 'MANUAL',
  isBuffer: false,
  createdAt: '2026-04-10T08:00:00Z',
};

const BLOCK_FIXTURE_2: TimeBlock = {
  id: 2,
  userId: 1,
  blockDate: '2026-04-10',
  startTime: '10:15',
  endTime: '11:00',
  category: 'HEALTH',
  title: 'Stretch break',
  status: 'PLANNED',
  source: 'AI_SUGGESTED',
  isBuffer: true,
  createdAt: '2026-04-10T08:00:00Z',
};

// ---------------------------------------------------------------------------
// useTimeline
// ---------------------------------------------------------------------------

describe('useTimeline', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches timeline by date and applies select to unwrap data', async () => {
    mockApi.getTimeline.mockResolvedValueOnce({
      success: true,
      data: [BLOCK_FIXTURE, BLOCK_FIXTURE_2],
      message: '',
    });

    const { result } = renderHook(() => useTimeline('2026-04-10'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // select should unwrap ApiResponse.data
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].title).toBe('Morning focus');
    expect(result.current.data![1].category).toBe('HEALTH');
    expect(mockApi.getTimeline).toHaveBeenCalledWith('2026-04-10');
  });

  it('passes different dates correctly to API', async () => {
    mockApi.getTimeline.mockResolvedValueOnce({
      success: true,
      data: [],
      message: '',
    });

    const { result } = renderHook(() => useTimeline('2026-05-01'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
    expect(mockApi.getTimeline).toHaveBeenCalledWith('2026-05-01');
  });

  it('propagates API error', async () => {
    mockApi.getTimeline.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useTimeline('2026-04-10'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Network failure');
  });
});

// ---------------------------------------------------------------------------
// useCreateTimeBlock
// ---------------------------------------------------------------------------

describe('useCreateTimeBlock', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls createTimeBlock API and invalidates timeline cache for blockDate', async () => {
    mockApi.createTimeBlock.mockResolvedValueOnce({
      success: true,
      data: BLOCK_FIXTURE,
      message: 'Created',
    });

    const { wrapper, spy } = createWrapperWithClient();
    const { result } = renderHook(() => useCreateTimeBlock(), { wrapper });

    await act(async () => {
      result.current.mutate({
        blockDate: '2026-04-10',
        startTime: '09:00',
        endTime: '10:00',
        category: 'WORK',
        title: 'Morning focus',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.createTimeBlock).toHaveBeenCalledWith({
      blockDate: '2026-04-10',
      startTime: '09:00',
      endTime: '10:00',
      category: 'WORK',
      title: 'Morning focus',
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeline', '2026-04-10'] });
  });

  it('propagates creation failure', async () => {
    mockApi.createTimeBlock.mockRejectedValueOnce(new Error('Validation error'));

    const { result } = renderHook(() => useCreateTimeBlock(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        blockDate: '2026-04-10',
        startTime: '09:00',
        endTime: '10:00',
        category: 'WORK',
        title: 'Morning focus',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Validation error');
  });
});

// ---------------------------------------------------------------------------
// useUpdateTimeBlock
// ---------------------------------------------------------------------------

describe('useUpdateTimeBlock', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls updateTimeBlock with id and request, invalidates specific date cache', async () => {
    const updatedBlock = { ...BLOCK_FIXTURE, title: 'Updated title' };
    mockApi.updateTimeBlock.mockResolvedValueOnce({
      success: true,
      data: updatedBlock,
      message: 'Updated',
    });

    const { wrapper, spy } = createWrapperWithClient();
    const { result } = renderHook(() => useUpdateTimeBlock(), { wrapper });

    await act(async () => {
      result.current.mutate({
        id: 1,
        blockDate: '2026-04-10',
        title: 'Updated title',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.updateTimeBlock).toHaveBeenCalledWith(1, {
      blockDate: '2026-04-10',
      title: 'Updated title',
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeline', '2026-04-10'] });
  });

  it('invalidates all timeline queries when blockDate is absent', async () => {
    mockApi.updateTimeBlock.mockResolvedValueOnce({
      success: true,
      data: { ...BLOCK_FIXTURE, title: 'Changed' },
      message: 'Updated',
    });

    const { wrapper, spy } = createWrapperWithClient();
    const { result } = renderHook(() => useUpdateTimeBlock(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 1, title: 'Changed' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.updateTimeBlock).toHaveBeenCalledWith(1, { title: 'Changed' });
    // Should invalidate the broad ['timeline'] key since no blockDate provided
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
  });

  it('propagates update failure', async () => {
    mockApi.updateTimeBlock.mockRejectedValueOnce(new Error('Not found'));

    const { result } = renderHook(() => useUpdateTimeBlock(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 999, blockDate: '2026-04-10', title: 'Nope' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Not found');
  });
});

// ---------------------------------------------------------------------------
// useDeleteTimeBlock
// ---------------------------------------------------------------------------

describe('useDeleteTimeBlock', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls deleteTimeBlock with id and invalidates specific date cache', async () => {
    mockApi.deleteTimeBlock.mockResolvedValueOnce({
      success: true,
      data: undefined as any,
      message: 'Deleted',
    });

    const { wrapper, spy } = createWrapperWithClient();
    const { result } = renderHook(() => useDeleteTimeBlock(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 1, blockDate: '2026-04-10' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.deleteTimeBlock).toHaveBeenCalledWith(1);
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeline', '2026-04-10'] });
  });

  it('invalidates all timeline queries when blockDate is absent', async () => {
    mockApi.deleteTimeBlock.mockResolvedValueOnce({
      success: true,
      data: undefined as any,
      message: 'Deleted',
    });

    const { wrapper, spy } = createWrapperWithClient();
    const { result } = renderHook(() => useDeleteTimeBlock(), { wrapper });

    await act(async () => {
      result.current.mutate({ id: 2 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.deleteTimeBlock).toHaveBeenCalledWith(2);
    // Broad invalidation since no blockDate
    expect(spy).toHaveBeenCalledWith({ queryKey: ['timeline'] });
  });

  it('propagates deletion failure', async () => {
    mockApi.deleteTimeBlock.mockRejectedValueOnce(new Error('Forbidden'));

    const { result } = renderHook(() => useDeleteTimeBlock(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({ id: 1, blockDate: '2026-04-10' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Forbidden');
  });
});
