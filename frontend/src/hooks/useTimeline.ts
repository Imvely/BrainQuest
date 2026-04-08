import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as mapApi from '../api/map';
import { TimeBlockCreateRequest } from '../types/timeline';

export function useTimeline(date: string) {
  return useQuery({
    queryKey: ['timeline', date],
    queryFn: () => mapApi.getTimeline(date),
    select: (res) => res.data,
    staleTime: 30000,
    refetchInterval: 60000,
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
