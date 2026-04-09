import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as battleApi from '../api/battle';
import { BattleStartRequest, BattleEndRequest } from '../types/battle';
import { STALE_TIME } from '../constants/query';

export function useStartBattle() {
  return useMutation({
    mutationFn: (request: BattleStartRequest) => battleApi.startBattle(request),
  });
}

export function useEndBattle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sessionId,
      request,
    }: {
      sessionId: number;
      request: BattleEndRequest;
    }) => battleApi.endBattle(sessionId, request),
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
    staleTime: STALE_TIME.NORMAL,
  });
}
