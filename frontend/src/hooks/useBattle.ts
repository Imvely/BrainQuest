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
      queryClient.invalidateQueries({ queryKey: ['timeline'] });
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

/**
 * 전투 기록 조회 — 백엔드는 {@code from}/{@code to} LocalDate 범위를 필수로 요구한다.
 * 호출자는 기본적으로 "오늘 ~ 7일 전" 범위를 제공해야 한다.
 */
export function useBattleHistory(params?: { from?: string; to?: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const from = params?.from ?? weekAgo;
  const to = params?.to ?? today;

  return useQuery({
    queryKey: ['battleHistory', from, to],
    queryFn: () => battleApi.getBattleHistory(from, to),
    select: (res) => res.data,
    staleTime: STALE_TIME.NORMAL,
  });
}
