import apiClient from './client';
import { ApiResponse } from '../types/api';
import { TimeBlock, TimePrediction, TimeBlockCreateRequest } from '../types/timeline';

export async function getTimeline(date: string): Promise<ApiResponse<TimeBlock[]>> {
  const { data } = await apiClient.get(`/map/timeline/${date}`);
  return data;
}

export async function createTimeBlock(request: TimeBlockCreateRequest): Promise<ApiResponse<TimeBlock>> {
  const { data } = await apiClient.post('/map/blocks', request);
  return data;
}

export async function updateTimeBlock(id: number, request: Partial<TimeBlockCreateRequest>): Promise<ApiResponse<TimeBlock>> {
  const { data } = await apiClient.put(`/map/blocks/${id}`, request);
  return data;
}

export async function deleteTimeBlock(id: number): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete(`/map/blocks/${id}`);
  return data;
}

export async function createPrediction(blockId: number, predictedMin: number): Promise<ApiResponse<TimePrediction>> {
  const { data } = await apiClient.post('/map/predictions', { blockId, predictedMin });
  return data;
}

export async function updatePredictionActual(id: number, actualMin: number): Promise<ApiResponse<TimePrediction>> {
  const { data } = await apiClient.put(`/map/predictions/${id}/actual`, { actualMin });
  return data;
}
