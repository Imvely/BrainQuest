import { QuestGrade } from '../constants/game';

export type QuestCategory = 'WORK' | 'HOME' | 'HEALTH' | 'SOCIAL' | 'SELF';
export type QuestStatus = 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
export type CheckpointStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface Quest {
  id: number;
  userId: number;
  originalTitle: string;
  questTitle: string;
  questStory: string;
  category: QuestCategory;
  grade: QuestGrade;
  estimatedMin: number;
  expReward: number;
  goldReward: number;
  status: QuestStatus;
  dueDate?: string;
  completedAt?: string;
  checkpoints: Checkpoint[];
  createdAt: string;
  updatedAt: string;
}

export interface Checkpoint {
  id: number;
  questId: number;
  orderNum: number;
  title: string;
  estimatedMin: number;
  expReward: number;
  goldReward: number;
  status: CheckpointStatus;
  completedAt?: string;
}

export interface QuestGenerateRequest {
  originalTitle: string;
  category: QuestCategory;
  estimatedMin?: number;
}

export interface QuestGenerateResponse {
  questTitle: string;
  questStory: string;
  grade: QuestGrade;
  estimatedMin: number;
  expReward: number;
  goldReward: number;
  checkpoints: Omit<Checkpoint, 'id' | 'questId' | 'status' | 'completedAt'>[];
}
