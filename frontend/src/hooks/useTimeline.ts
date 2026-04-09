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
    mutationFn: ({ id, ...request }: Partial<TimeBlockCreateRequest> & { id: number }) =>
      mapApi.updateTimeBlock(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}

export function useDeleteTimeBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => mapApi.deleteTimeBlock(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
    },
  });
}
