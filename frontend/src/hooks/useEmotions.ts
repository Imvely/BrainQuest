import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as skyApi from '../api/sky';
import { EmotionRecordRequest } from '../types/emotion';

export function useEmotionCalendar(yearMonth: string) {
  return useQuery({
    queryKey: ['emotionCalendar', yearMonth],
    queryFn: () => skyApi.getEmotionCalendar(yearMonth),
    select: (res) => res.data,
  });
}

export function useWeeklySummary() {
  return useQuery({
    queryKey: ['weeklySummary'],
    queryFn: () => skyApi.getWeeklySummary(),
    select: (res) => res.data,
  });
}

export function useCreateEmotion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: EmotionRecordRequest) => skyApi.createEmotionRecord(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emotionCalendar'] });
      queryClient.invalidateQueries({ queryKey: ['weeklySummary'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });
}
