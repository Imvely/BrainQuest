import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as mapApi from '../api/map';
import { TimeBlockCreateRequest } from '../types/timeline';
import { STALE_TIME } from '../constants/query';

export function useTimeline(date: string) {
  return useQuery({
    queryKey: ['timeline', date],
    queryFn: () => mapApi.getTimeline(date),
    select: (res) => res.data,
    staleTime: STALE_TIME.FAST,
    refetchInterval: STALE_TIME.NORMAL,
  });
}

export function useCreateTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: TimeBlockCreateRequest) => mapApi.createTimeBlock(request),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['timeline', variables.blockDate] });
    },
  });
}

export function useUpdateTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...request }: Partial<TimeBlockCreateRequest> & { id: number; blockDate?: string }) =>
      mapApi.updateTimeBlock(id, request),
    onSuccess: (_, variables) => {
      if (variables.blockDate) {
        queryClient.invalidateQueries({ queryKey: ['timeline', variables.blockDate] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
      }
    },
  });
}

export function useDeleteTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, blockDate }: { id: number; blockDate?: string }) =>
      mapApi.deleteTimeBlock(id),
    onSuccess: (_, variables) => {
      if (variables.blockDate) {
        queryClient.invalidateQueries({ queryKey: ['timeline', variables.blockDate] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['timeline'] });
      }
    },
  });
}
