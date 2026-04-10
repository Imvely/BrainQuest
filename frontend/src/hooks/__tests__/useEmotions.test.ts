import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useEmotionCalendar,
  useWeeklySummary,
  useEmotionsByDate,
  useTodayEmotions,
  useCreateEmotion,
} from '../useEmotions';
import * as skyApi from '../../api/sky';
import { useEmotionStore } from '../../stores/useEmotionStore';
import { EmotionRecord, EmotionCalendarDay, WeeklySummary } from '../../types/emotion';
import { ApiResponse } from '../../types/api';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('../../api/sky');
const mockApi = skyApi as jest.Mocked<typeof skyApi>;

// ---------------------------------------------------------------------------
// Helpers & Fixtures
// ---------------------------------------------------------------------------

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function createWrapper(qc?: QueryClient) {
  const client = qc ?? createQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

const RECORD_SUNNY: EmotionRecord = {
  id: 1,
  userId: 1,
  weatherType: 'SUNNY',
  intensity: 4,
  tags: ['감사'],
  memo: '좋은 하루',
  recordedAt: '2026-04-10T10:00:00Z',
  createdAt: '2026-04-10T10:00:00Z',
};

const RECORD_RAIN: EmotionRecord = {
  id: 2,
  userId: 1,
  weatherType: 'RAIN',
  intensity: 2,
  tags: ['피곤', 'RSD'],
  recordedAt: '2026-04-10T15:00:00Z',
  createdAt: '2026-04-10T15:00:00Z',
};

const CALENDAR_DAYS: EmotionCalendarDay[] = [
  { date: '2026-04-01', weatherType: 'SUNNY', avgIntensity: 4, count: 2 },
  { date: '2026-04-02', weatherType: 'CLOUDY', avgIntensity: 3, count: 1 },
  { date: '2026-04-03', weatherType: 'RAIN', avgIntensity: 2.5, count: 3 },
];

const WEEKLY_SUMMARY: WeeklySummary = {
  weekStart: '2026-04-07',
  weekEnd: '2026-04-13',
  dominantWeather: 'SUNNY',
  avgIntensity: 3.5,
  totalRecords: 10,
  weatherDistribution: {
    SUNNY: 4,
    PARTLY_CLOUDY: 2,
    CLOUDY: 1,
    FOG: 0,
    RAIN: 2,
    THUNDER: 1,
    STORM: 0,
  },
  topTags: ['감사', '피곤', 'RSD'],
};

function apiOk<T>(data: T): ApiResponse<T> {
  return { success: true, data, message: '' };
}

// ---------------------------------------------------------------------------
// Tests — useEmotionCalendar
// ---------------------------------------------------------------------------

describe('useEmotionCalendar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches calendar data for the given year-month and applies select', async () => {
    mockApi.getEmotionCalendar.mockResolvedValueOnce(apiOk(CALENDAR_DAYS));

    const { result } = renderHook(() => useEmotionCalendar('2026-04'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // select unwraps res.data so we get the array directly
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data![0].date).toBe('2026-04-01');
    expect(result.current.data![0].weatherType).toBe('SUNNY');
    expect(result.current.data![2].count).toBe(3);
    expect(mockApi.getEmotionCalendar).toHaveBeenCalledTimes(1);
    expect(mockApi.getEmotionCalendar).toHaveBeenCalledWith('2026-04');
  });

  it('uses different query keys for different months', async () => {
    mockApi.getEmotionCalendar.mockResolvedValue(apiOk([]));

    const qc = createQueryClient();
    const wrapper = createWrapper(qc);

    const { result: r1 } = renderHook(() => useEmotionCalendar('2026-03'), { wrapper });
    const { result: r2 } = renderHook(() => useEmotionCalendar('2026-04'), { wrapper });

    await waitFor(() => {
      expect(r1.current.isSuccess).toBe(true);
      expect(r2.current.isSuccess).toBe(true);
    });

    // Both months fetched independently
    expect(mockApi.getEmotionCalendar).toHaveBeenCalledWith('2026-03');
    expect(mockApi.getEmotionCalendar).toHaveBeenCalledWith('2026-04');
    expect(mockApi.getEmotionCalendar).toHaveBeenCalledTimes(2);
  });

  it('propagates API error', async () => {
    mockApi.getEmotionCalendar.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() => useEmotionCalendar('2026-04'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe('Network failure');
    expect(result.current.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — useWeeklySummary
// ---------------------------------------------------------------------------

describe('useWeeklySummary', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches weekly summary and applies select', async () => {
    mockApi.getWeeklySummary.mockResolvedValueOnce(apiOk(WEEKLY_SUMMARY));

    const { result } = renderHook(() => useWeeklySummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.dominantWeather).toBe('SUNNY');
    expect(result.current.data?.avgIntensity).toBe(3.5);
    expect(result.current.data?.totalRecords).toBe(10);
    expect(result.current.data?.topTags).toEqual(['감사', '피곤', 'RSD']);
    expect(result.current.data?.weatherDistribution.SUNNY).toBe(4);
    expect(mockApi.getWeeklySummary).toHaveBeenCalledTimes(1);
  });

  it('propagates API error', async () => {
    mockApi.getWeeklySummary.mockRejectedValueOnce(new Error('500 Internal'));

    const { result } = renderHook(() => useWeeklySummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — useEmotionsByDate
// ---------------------------------------------------------------------------

describe('useEmotionsByDate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches records when a valid date is provided', async () => {
    mockApi.getEmotionsByDate.mockResolvedValueOnce(apiOk([RECORD_SUNNY, RECORD_RAIN]));

    const { result } = renderHook(() => useEmotionsByDate('2026-04-10'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].weatherType).toBe('SUNNY');
    expect(result.current.data![1].weatherType).toBe('RAIN');
    expect(mockApi.getEmotionsByDate).toHaveBeenCalledWith('2026-04-10');
  });

  it('is disabled and does not fetch when date is null', async () => {
    const { result } = renderHook(() => useEmotionsByDate(null), {
      wrapper: createWrapper(),
    });

    // Give React Query time to potentially fire
    await new Promise((r) => setTimeout(r, 50));

    expect(mockApi.getEmotionsByDate).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
    expect(result.current.data).toBeUndefined();
  });

  it('becomes enabled when date changes from null to a value', async () => {
    mockApi.getEmotionsByDate.mockResolvedValueOnce(apiOk([RECORD_SUNNY]));

    let date: string | null = null;
    const { result, rerender } = renderHook(() => useEmotionsByDate(date), {
      wrapper: createWrapper(),
    });

    // Initially disabled
    await new Promise((r) => setTimeout(r, 50));
    expect(mockApi.getEmotionsByDate).not.toHaveBeenCalled();

    // Provide a date
    date = '2026-04-10';
    rerender({});

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.getEmotionsByDate).toHaveBeenCalledWith('2026-04-10');
    expect(result.current.data).toHaveLength(1);
  });

  it('propagates API error when date is provided', async () => {
    mockApi.getEmotionsByDate.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useEmotionsByDate('2026-04-10'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe('Unauthorized');
  });
});

// ---------------------------------------------------------------------------
// Tests — useTodayEmotions
// ---------------------------------------------------------------------------

describe('useTodayEmotions', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches emotions for today\'s date', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    mockApi.getEmotionsByDate.mockResolvedValueOnce(apiOk([RECORD_SUNNY]));

    const { result } = renderHook(() => useTodayEmotions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.getEmotionsByDate).toHaveBeenCalledWith(todayStr);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].id).toBe(RECORD_SUNNY.id);
  });

  it('returns empty array when no emotions recorded today', async () => {
    mockApi.getEmotionsByDate.mockResolvedValueOnce(apiOk([]));

    const { result } = renderHook(() => useTodayEmotions(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Tests — useCreateEmotion
// ---------------------------------------------------------------------------

describe('useCreateEmotion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the Zustand store to its initial state before each test
    useEmotionStore.setState({
      recentRecords: [],
      todayCount: 0,
      recentWeather: null,
      calendar: [],
      weeklySummary: null,
    });
  });

  it('calls API, updates Zustand store, and invalidates all 4 query keys', async () => {
    mockApi.createEmotionRecord.mockResolvedValueOnce(apiOk(RECORD_SUNNY));

    const qc = createQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const wrapper = createWrapper(qc);

    const { result } = renderHook(() => useCreateEmotion(), { wrapper });

    await act(async () => {
      result.current.mutate({
        weatherType: 'SUNNY',
        intensity: 4,
        tags: ['감사'],
        memo: '좋은 하루',
        recordedAt: '2026-04-10T10:00:00Z',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verify API was called with the right request
    expect(mockApi.createEmotionRecord).toHaveBeenCalledTimes(1);
    expect(mockApi.createEmotionRecord).toHaveBeenCalledWith({
      weatherType: 'SUNNY',
      intensity: 4,
      tags: ['감사'],
      memo: '좋은 하루',
      recordedAt: '2026-04-10T10:00:00Z',
    });

    // Verify Zustand store was updated via addRecord
    const state = useEmotionStore.getState();
    expect(state.recentRecords).toHaveLength(1);
    expect(state.recentRecords[0].id).toBe(RECORD_SUNNY.id);
    expect(state.todayCount).toBe(1);
    expect(state.recentWeather).toBe('SUNNY');

    // Verify all 4 query keys invalidated
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['emotionCalendar'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['weeklySummary'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['emotionsByDate'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['character'] });
  });

  it('accumulates multiple records in the store', async () => {
    mockApi.createEmotionRecord
      .mockResolvedValueOnce(apiOk(RECORD_SUNNY))
      .mockResolvedValueOnce(apiOk(RECORD_RAIN));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateEmotion(), { wrapper });

    // First mutation
    await act(async () => {
      result.current.mutate({
        weatherType: 'SUNNY',
        intensity: 4,
        tags: ['감사'],
        recordedAt: '2026-04-10T10:00:00Z',
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Second mutation
    await act(async () => {
      result.current.mutate({
        weatherType: 'RAIN',
        intensity: 2,
        tags: ['피곤', 'RSD'],
        recordedAt: '2026-04-10T15:00:00Z',
      });
    });
    await waitFor(() => expect(result.current.data).toBeDefined());

    const state = useEmotionStore.getState();
    expect(state.recentRecords).toHaveLength(2);
    // Most recent record should be first (prepended)
    expect(state.recentRecords[0].weatherType).toBe('RAIN');
    expect(state.recentRecords[1].weatherType).toBe('SUNNY');
    expect(state.todayCount).toBe(2);
    expect(state.recentWeather).toBe('RAIN');
  });

  it('does not update store when API rejects', async () => {
    mockApi.createEmotionRecord.mockRejectedValueOnce(new Error('Server Error'));

    const { result } = renderHook(() => useCreateEmotion(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        weatherType: 'STORM',
        intensity: 1,
        recordedAt: '2026-04-10T20:00:00Z',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Store must remain untouched
    const state = useEmotionStore.getState();
    expect(state.recentRecords).toHaveLength(0);
    expect(state.todayCount).toBe(0);
    expect(state.recentWeather).toBeNull();
  });

  it('does not invalidate queries when API rejects', async () => {
    mockApi.createEmotionRecord.mockRejectedValueOnce(new Error('Timeout'));

    const qc = createQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const wrapper = createWrapper(qc);

    const { result } = renderHook(() => useCreateEmotion(), { wrapper });

    await act(async () => {
      result.current.mutate({
        weatherType: 'THUNDER',
        intensity: 2,
        recordedAt: '2026-04-10T18:00:00Z',
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it('passes the mutation return data through', async () => {
    mockApi.createEmotionRecord.mockResolvedValueOnce(apiOk(RECORD_RAIN));

    const { result } = renderHook(() => useCreateEmotion(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.mutate({
        weatherType: 'RAIN',
        intensity: 2,
        tags: ['피곤', 'RSD'],
        recordedAt: '2026-04-10T15:00:00Z',
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // mutationFn returns the full ApiResponse; data is the raw response
    expect(result.current.data?.success).toBe(true);
    expect(result.current.data?.data.id).toBe(RECORD_RAIN.id);
    expect(result.current.data?.data.weatherType).toBe('RAIN');
  });
});
