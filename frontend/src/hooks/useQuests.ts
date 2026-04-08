import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as questApi from '../api/quest';
import { QuestGenerateRequest, QuestCategory, QuestStatus } from '../types/quest';

export function useQuests(params?: { status?: QuestStatus; category?: QuestCategory }) {
  return useQuery({
    queryKey: ['quests', params],
    queryFn: () => questApi.getQuests(params),
    select: (res) => res.data,
  });
}

export function useQuestDetail(id: number) {
  return useQuery({
    queryKey: ['quest', id],
    queryFn: () => questApi.getQuestDetail(id),
    select: (res) => res.data,
    enabled: id > 0,
  });
}

export function useGenerateQuest() {
  return useMutation({
    mutationFn: (request: QuestGenerateRequest) => questApi.generateQuest(request),
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
