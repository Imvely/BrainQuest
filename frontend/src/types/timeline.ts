export type BlockCategory = 'WORK' | 'HOME' | 'HEALTH' | 'SOCIAL' | 'REST' | 'CUSTOM';
export type BlockStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
export type BlockSource = 'MANUAL' | 'AI_SUGGESTED' | 'CALENDAR_SYNC';

export interface TimeBlock {
  id: number;
  userId: number;
  blockDate: string;
  startTime: string;
  endTime: string;
  category: BlockCategory;
  title: string;
  questId?: number;
  status: BlockStatus;
  actualStart?: string;
  actualEnd?: string;
  source: BlockSource;
  isBuffer: boolean;
  createdAt: string;
}

export interface TimePrediction {
  id: number;
  userId: number;
  blockId: number;
  predictedMin: number;
  actualMin?: number;
  accuracyPct?: number;
  createdAt: string;
}

export interface TimeBlockCreateRequest {
  blockDate: string;
  startTime: string;
  endTime: string;
  category: BlockCategory;
  title: string;
  questId?: number;
  isBuffer?: boolean;
}
