import apiClient from './client';
import { ApiResponse, PageResponse } from '../types/api';
import { Quest, QuestGenerateRequest, QuestGenerateResponse, QuestStatus, QuestCategory } from '../types/quest';

export async function generateQuest(request: QuestGenerateRequest): Promise<ApiResponse<QuestGenerateResponse>> {
  const { data } = await apiClient.post('/quest/generate', request);
  return data;
}

export async function createQuest(quest: QuestGenerateResponse & { originalTitle: string; category: QuestCategory }): Promise<ApiResponse<Quest>> {
  const { data } = await apiClient.post('/quest', quest);
  return data;
}

export async function getQuests(params?: {
  status?: QuestStatus;
  category?: QuestCategory;
  page?: number;
  size?: number;
}): Promise<ApiResponse<PageResponse<Quest>>> {
  const { data } = await apiClient.get('/quest', { params });
  return data;
}

export async function getQuestDetail(id: number): Promise<ApiResponse<Quest>> {
  const { data } = await apiClient.get(`/quest/${id}`);
  return data;
}

export async function completeCheckpoint(questId: number, checkpointId: number): Promise<ApiResponse<void>> {
  const { data } = await apiClient.put(`/quest/${questId}/checkpoints/${checkpointId}/complete`);
  return data;
}
