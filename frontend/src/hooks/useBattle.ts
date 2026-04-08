import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as battleApi from '../api/battle';
import { BattleStartRequest } from '../types/battle';

export function useStartBattle() {
  return useMutation({
    mutationFn: (request: BattleStartRequest) => battleApi.startBattle(request),
  });
}

export function useEndBattle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: number) => battleApi.endBattle(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['battleHistory'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
}

export function useRecordExit() {
  return useMutation({
    mutationFn: (sessionId: number) => battleApi.recordExit(sessionId),
  });
}

export function useRecordReturn() {
  return useMutation({
    mutationFn: (sessionId: number) => battleApi.recordReturn(sessionId),
  });
}

export function useBattleHistory(params?: { page?: number; size?: number }) {
  return useQuery({
    queryKey: ['battleHistory', params],
    queryFn: () => battleApi.getBattleHistory(params),
    select: (res) => res.data,
  });
}
