import { QuestGrade } from '../constants/game';

export type QuestCategory = 'WORK' | 'HOME' | 'HEALTH' | 'SOCIAL' | 'SELF';
export type QuestStatus = 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type CheckpointStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * 퀘스트.
 * <p>백엔드는 두 가지 응답 DTO를 사용한다:</p>
 * <ul>
 *   <li>{@code QuestDetailResponse} (GET /quest/{id}): {@code questStory, dueDate, completedAt, checkpoints[]} 포함</li>
 *   <li>{@code QuestResponse} (GET /quest): 위 필드들이 없고 {@code completedCheckpoints, totalCheckpoints}만 제공</li>
 * </ul>
 * <p>프론트는 단일 {@code Quest} 타입으로 통합하며, 목록 컨텍스트에서만 사용되는 필드는 optional이다.</p>
 */
export interface Quest {
  id: number;
  originalTitle: string;
  questTitle: string;
  category: QuestCategory;
  grade: QuestGrade;
  status: QuestStatus;
  estimatedMin: number;
  expReward: number;
  goldReward: number;
  createdAt: string;

  // 상세 응답(QuestDetailResponse)에만 존재
  questStory?: string;
  dueDate?: string;
  completedAt?: string;
  checkpoints?: Checkpoint[];

  // 목록 응답(QuestResponse)에만 존재 (진행률)
  completedCheckpoints?: number;
  totalCheckpoints?: number;
}

/**
 * 목록 조회용 요약 (하위 호환 alias).
 */
export type QuestSummary = Quest;

/**
 * 체크포인트 — 백엔드 {@code CheckpointResponse}.
 * <p>{@code questId} 필드는 백엔드 응답에 포함되지 않는다 (관계는 상위 Quest로 표현).</p>
 */
export interface Checkpoint {
  id: number;
  orderNum: number;
  title: string;
  estimatedMin: number;
  expReward: number;
  goldReward: number;
  status: CheckpointStatus;
  completedAt?: string;
}

/**
 * AI 퀘스트 변환 요청 — 백엔드 {@code GenerateQuestRequest}.
 * <p>{@code estimatedMin}은 5 이상 필수.</p>
 */
export interface QuestGenerateRequest {
  originalTitle: string;
  estimatedMin: number;
  category: QuestCategory;
}

/**
 * AI 퀘스트 변환 응답 — 백엔드 {@code GenerateQuestResponse}.
 */
export interface QuestGenerateResponse {
  originalTitle: string;
  questTitle: string;
  questStory: string;
  grade: QuestGrade;
  estimatedMin: number;
  expReward: number;
  goldReward: number;
  checkpoints: CheckpointGenerated[];
}

/**
 * 생성 단계의 체크포인트 (DB 저장 전).
 */
export interface CheckpointGenerated {
  orderNum: number;
  title: string;
  estimatedMin: number;
  expReward: number;
  goldReward: number;
}

/**
 * 퀘스트 저장 요청 — 백엔드 {@code SaveQuestRequest}.
 */
export interface QuestSaveRequest {
  originalTitle: string;
  questTitle: string;
  questStory: string;
  category: QuestCategory;
  grade: QuestGrade;
  estimatedMin: number;
  dueDate?: string;
  checkpoints: { title: string; estimatedMin: number }[];
}

/**
 * 체크포인트 완료 응답 — 백엔드 {@code CheckpointCompleteResponse} (@JsonInclude(NON_NULL)).
 */
export interface CheckpointCompleteResponse {
  checkpoint: Checkpoint;
  reward: { exp: number; gold: number };
  questCompleted: boolean;
  itemDrop?: {
    id: number;
    item: {
      id: number;
      name: string;
      rarity: string;
    };
    source: string;
  };
}
