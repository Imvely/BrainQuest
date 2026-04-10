import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  TimeBlock,
  TimelineResponse,
  TimeBlockCreateRequest,
  TimeBlockUpdateRequest,
  TimePrediction,
  TimePredictionResult,
} from '../types/timeline';

/**
 * 특정 날짜의 전체 타임라인 조회.
 * 백엔드 {@code GET /api/v1/map/timeline/{date}} — 응답은 {@code TimelineResponse} 객체.
 *
 * @param date yyyy-MM-dd 형식
 */
export async function getTimeline(
  date: string,
): Promise<ApiResponse<TimelineResponse>> {
  const { data } = await apiClient.get(`/map/timeline/${date}`);
  return data;
}

export async function createTimeBlock(
  request: TimeBlockCreateRequest,
): Promise<ApiResponse<TimeBlock>> {
  const { data } = await apiClient.post('/map/blocks', request);
  return data;
}

/**
 * 타임블록 수정 — 백엔드 {@code UpdateBlockRequest}는 {@code blockDate}/{@code questId} 수정을 지원하지 않는다.
 */
export async function updateTimeBlock(
  id: number,
  request: TimeBlockUpdateRequest,
): Promise<ApiResponse<TimeBlock>> {
  const { data } = await apiClient.put(`/map/blocks/${id}`, request);
  return data;
}

export async function deleteTimeBlock(id: number): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete(`/map/blocks/${id}`);
  return data;
}

/**
 * 잔여 시간 조회 (별도 엔드포인트) — 백엔드 {@code GET /api/v1/map/remaining-time}.
 */
export interface RemainingTimeResponse {
  remainingMin: number;
  /** HH:mm 형식 */
  sleepTime: string;
}

export async function getRemainingTime(): Promise<ApiResponse<RemainingTimeResponse>> {
  const { data } = await apiClient.get('/map/remaining-time');
  return data;
}

// ---------------------------------------------------------------------------
// Time predictions
// ---------------------------------------------------------------------------

export async function createPrediction(
  blockId: number,
  predictedMin: number,
): Promise<ApiResponse<TimePrediction>> {
  const { data } = await apiClient.post('/map/predictions', { blockId, predictedMin });
  return data;
}

export async function updatePredictionActual(
  id: number,
  actualMin: number,
): Promise<ApiResponse<TimePredictionResult>> {
  const { data } = await apiClient.put(`/map/predictions/${id}/actual`, { actualMin });
  return data;
}
