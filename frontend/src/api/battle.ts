import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  BattleSession,
  BattleStartRequest,
  BattleEndRequest,
  BattleEndResponse,
  BattleExitResponse,
  BattleReturnResponse,
} from '../types/battle';

export async function startBattle(
  request: BattleStartRequest,
): Promise<ApiResponse<BattleSession>> {
  const { data } = await apiClient.post('/battle/start', request);
  return data;
}

export async function recordExit(
  sessionId: number,
): Promise<ApiResponse<BattleExitResponse>> {
  const { data } = await apiClient.post(`/battle/${sessionId}/exit`);
  return data;
}

export async function recordReturn(
  sessionId: number,
): Promise<ApiResponse<BattleReturnResponse>> {
  const { data } = await apiClient.post(`/battle/${sessionId}/return`);
  return data;
}

export async function endBattle(
  sessionId: number,
  request: BattleEndRequest,
): Promise<ApiResponse<BattleEndResponse>> {
  const { data } = await apiClient.post(`/battle/${sessionId}/end`, request);
  return data;
}

export async function getBattleHistory(
  params?: { page?: number; size?: number },
): Promise<ApiResponse<BattleSession[]>> {
  const { data } = await apiClient.get('/battle/history', { params });
  return data;
}
