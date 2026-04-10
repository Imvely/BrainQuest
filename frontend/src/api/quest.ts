import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  Quest,
  QuestSummary,
  QuestGenerateRequest,
  QuestGenerateResponse,
  QuestSaveRequest,
  QuestCategory,
  CheckpointCompleteResponse,
} from '../types/quest';

/**
 * Claude API로 퀘스트 변환 (DB에 저장하지 않음).
 * 백엔드 {@code POST /api/v1/quest/generate}.
 */
export async function generateQuest(
  request: QuestGenerateRequest,
): Promise<ApiResponse<QuestGenerateResponse>> {
  const { data } = await apiClient.post('/quest/generate', request);
  return data;
}

/**
 * 퀘스트 저장.
 * 백엔드 {@code POST /api/v1/quest} — {@code SaveQuestRequest}를 받아 {@code QuestResponse}(요약) 반환.
 */
export async function createQuest(
  quest: QuestSaveRequest,
): Promise<ApiResponse<QuestSummary>> {
  const { data } = await apiClient.post('/quest', quest);
  return data;
}

/**
 * 활성 퀘스트 목록 조회.
 * <p>백엔드는 {@code category}만 쿼리 파라미터로 받으며, 응답은 {@code List<QuestResponse>} (배열 직접).
 * 프론트 과거 코드의 {@code status/page/size}는 백엔드에서 무시된다.</p>
 */
export async function getQuests(params?: {
  category?: QuestCategory;
}): Promise<ApiResponse<QuestSummary[]>> {
  const { data } = await apiClient.get('/quest', { params });
  return data;
}

/**
 * 퀘스트 상세 조회 — 체크포인트 포함.
 */
export async function getQuestDetail(id: number): Promise<ApiResponse<Quest>> {
  const { data } = await apiClient.get(`/quest/${id}`);
  return data;
}

/**
 * 체크포인트 완료 처리.
 * 백엔드는 {@code CheckpointCompleteResponse}({@code checkpoint, reward, questCompleted, itemDrop})를 반환한다.
 */
export async function completeCheckpoint(
  questId: number,
  checkpointId: number,
): Promise<ApiResponse<CheckpointCompleteResponse>> {
  const { data } = await apiClient.put(
    `/quest/${questId}/checkpoints/${checkpointId}/complete`,
  );
  return data;
}
