import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as questApi from '../api/quest';
import { QuestGenerateRequest, QuestSaveRequest, QuestCategory } from '../types/quest';
import { STALE_TIME } from '../constants/query';

/**
 * 활성 퀘스트 목록 조회.
 * <p>백엔드는 배열을 직접 반환한다 (페이지네이션 없음).</p>
 */
export function useQuests(params?: { category?: QuestCategory }) {
  return useQuery({
    queryKey: ['quests', params],
    queryFn: () => questApi.getQuests(params),
    select: (res) => res.data,
    staleTime: STALE_TIME.FAST,
  });
}

export function useQuestDetail(id: number) {
  return useQuery({
    queryKey: ['quest', id],
    queryFn: () => questApi.getQuestDetail(id),
    select: (res) => res.data,
    enabled: id > 0,
    staleTime: STALE_TIME.FAST,
  });
}

export function useGenerateQuest() {
  return useMutation({
    mutationFn: (request: QuestGenerateRequest) => questApi.generateQuest(request),
  });
}

export function useCreateQuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (quest: QuestSaveRequest) => questApi.createQuest(quest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quests'] });
    },
  });
}

export function useCompleteCheckpoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questId, checkpointId }: { questId: number; checkpointId: number }) =>
      questApi.completeCheckpoint(questId, checkpointId),
    onSuccess: (_, { questId }) => {
      queryClient.invalidateQueries({ queryKey: ['quest', questId] });
      queryClient.invalidateQueries({ queryKey: ['quests'] });
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });
}
