import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  BattleStartRequest,
  BattleStartResponse,
  BattleEndRequest,
  BattleEndResponse,
  BattleExitResponse,
  BattleReturnResponse,
  BattleHistoryItem,
} from '../types/battle';

/**
 * 전투 시작 — 백엔드 {@code POST /api/v1/battle/start}.
 * <p>응답: {@code StartBattleResponse { sessionId, monster, plannedMin }}.</p>
 */
export async function startBattle(
  request: BattleStartRequest,
): Promise<ApiResponse<BattleStartResponse>> {
  const { data } = await apiClient.post('/battle/start', request);
  return data;
}

/**
 * 이탈 기록 — {@code POST /api/v1/battle/{id}/exit}.
 * <p>응답은 {@code exitId}만 포함. 페널티는 복귀 시점에 결정된다.</p>
 */
export async function recordExit(
  sessionId: number,
): Promise<ApiResponse<BattleExitResponse>> {
  const { data } = await apiClient.post(`/battle/${sessionId}/exit`);
  return data;
}

/**
 * 복귀 기록 — {@code POST /api/v1/battle/{id}/return}.
 */
export async function recordReturn(
  sessionId: number,
): Promise<ApiResponse<BattleReturnResponse>> {
  const { data } = await apiClient.post(`/battle/${sessionId}/return`);
  return data;
}

/**
 * 전투 종료 — {@code POST /api/v1/battle/{id}/end}.
 */
export async function endBattle(
  sessionId: number,
  request: BattleEndRequest,
): Promise<ApiResponse<BattleEndResponse>> {
  const { data } = await apiClient.post(`/battle/${sessionId}/end`, request);
  return data;
}

/**
 * 전투 기록 조회 — {@code GET /api/v1/battle/history}.
 * <p>백엔드는 {@code from}, {@code to} 날짜 범위 쿼리 파라미터를 필수로 요구한다.
 * 페이지네이션은 지원하지 않는다.</p>
 *
 * @param from yyyy-MM-dd 형식
 * @param to   yyyy-MM-dd 형식
 */
export async function getBattleHistory(
  from: string,
  to: string,
): Promise<ApiResponse<BattleHistoryItem[]>> {
  const { data } = await apiClient.get('/battle/history', {
    params: { from, to },
  });
  return data;
}
