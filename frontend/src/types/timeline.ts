export type BlockCategory = 'WORK' | 'HOME' | 'HEALTH' | 'SOCIAL' | 'REST' | 'CUSTOM';
export type BlockStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type BlockSource = 'MANUAL' | 'AI_SUGGESTED' | 'CALENDAR_SYNC';

/**
 * 타임블록.
 * <p>백엔드 {@code BlockResponse}는 {@code id, blockDate, startTime, endTime, category, title, questId, status, source}만 반환한다.
 * (actualStart/actualEnd/isBuffer/createdAt/userId는 응답에 포함되지 않음)</p>
 */
export interface TimeBlock {
  id: number;
  blockDate: string;
  startTime: string;
  endTime: string;
  category: BlockCategory;
  title: string;
  questId?: number;
  status: BlockStatus;
  source: BlockSource;
  // 아래 필드들은 백엔드 BlockResponse에 포함되지 않지만 프론트 렌더링에 필요할 수 있어 optional로 유지
  userId?: number;
  actualStart?: string;
  actualEnd?: string;
  isBuffer?: boolean;
  createdAt?: string;
}

/**
 * 백엔드 {@code TimelineResponse} 전체.
 */
export interface TimelineResponse {
  blocks: TimeBlock[];
  remainingMin: number;
  questSummary: QuestSummary;
  battleSessions: BattleSessionSummary[];
  emotionRecords: EmotionSummary[];
}

export interface QuestSummary {
  completed: number;
  total: number;
}

export interface BattleSessionSummary {
  id: number;
  monsterType: string;
  /** VICTORY / DEFEAT / ABANDON / null (진행 중) */
  result: string | null;
  plannedMin: number;
  actualMin?: number;
}

export interface EmotionSummary {
  id: number;
  weatherType: string;
  intensity: number;
  memo?: string;
}

/**
 * 시간 예측 — 백엔드 {@code PredictionResponse}: {@code id, blockId, predictedMin}.
 */
export interface TimePrediction {
  id: number;
  blockId: number;
  predictedMin: number;
}

/**
 * 실제 시간 기록 결과 — 백엔드 {@code PredictionResultResponse}.
 */
export interface TimePredictionResult {
  predictedMin: number;
  actualMin: number;
  accuracyPct: number;
  expEarned: number;
}

/**
 * 타임블록 생성 요청 — 백엔드 {@code CreateBlockRequest}.
 * <p>{@code isBuffer}는 백엔드 DTO에 없음.</p>
 */
export interface TimeBlockCreateRequest {
  blockDate: string;
  startTime: string;
  endTime: string;
  category: BlockCategory;
  title: string;
  questId?: number;
}

/**
 * 타임블록 수정 요청 — 백엔드 {@code UpdateBlockRequest}.
 * <p>모든 필드 optional. {@code blockDate}와 {@code questId}는 수정 불가.</p>
 */
export interface TimeBlockUpdateRequest {
  startTime?: string;
  endTime?: string;
  category?: BlockCategory;
  title?: string;
  status?: BlockStatus;
}
