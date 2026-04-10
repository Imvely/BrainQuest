import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as skyApi from '../api/sky';
import { EmotionRecordRequest } from '../types/emotion';
import { useEmotionStore } from '../stores/useEmotionStore';
import { STALE_TIME } from '../constants/query';

export function useEmotionCalendar(yearMonth: string) {
  return useQuery({
    queryKey: ['emotionCalendar', yearMonth],
    queryFn: () => skyApi.getEmotionCalendar(yearMonth),
    select: (res) => res.data,
    staleTime: STALE_TIME.NORMAL,
  });
}

export function useWeeklySummary() {
  return useQuery({
    queryKey: ['weeklySummary'],
    queryFn: () => skyApi.getWeeklySummary(),
    select: (res) => res.data,
    staleTime: STALE_TIME.NORMAL,
  });
}

export function useEmotionsByDate(date: string | null) {
  return useQuery({
    queryKey: ['emotionsByDate', date],
    queryFn: () => skyApi.getEmotionsByDate(date!),
    select: (res) => res.data,
    enabled: !!date,
    staleTime: STALE_TIME.FAST,
  });
}

export function useTodayEmotions() {
  const today = new Date().toISOString().slice(0, 10);

  return useQuery({
    queryKey: ['emotionsByDate', today],
    queryFn: () => skyApi.getEmotionsByDate(today),
    select: (res) => res.data,
    staleTime: STALE_TIME.NORMAL,
  });
}

export function useCreateEmotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: EmotionRecordRequest) => skyApi.createEmotionRecord(request),
    onSuccess: (res) => {
      useEmotionStore.getState().addRecord(res.data);
      queryClient.invalidateQueries({ queryKey: ['emotionCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['weeklySummary'] });
      queryClient.invalidateQueries({ queryKey: ['emotionsByDate'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });
}
