export type BattleResult = 'VICTORY' | 'DEFEAT' | 'ABANDON';
export type PenaltyType = 'COMBO_RESET' | 'HP_RECOVER' | 'HP_DAMAGE' | 'DEFEAT';

export interface BattleSession {
  id: number;
  userId: number;
  questId?: number;
  checkpointId?: number;
  plannedMin: number;
  actualMin?: number;
  monsterType: string;
  monsterMaxHp: number;
  monsterRemainingHp: number;
  maxCombo: number;
  exitCount: number;
  totalExitSec: number;
  result?: BattleResult;
  expEarned: number;
  goldEarned: number;
  itemDrops?: ItemDrop[];
  startedAt: string;
  endedAt?: string;
}

export interface ItemDrop {
  itemId: number;
  name: string;
  rarity: string;
}

export interface BattleExit {
  id: number;
  sessionId: number;
  exitAt: string;
  returnAt?: string;
  durationSec?: number;
  penaltyType: PenaltyType;
}

export interface BattleStartRequest {
  questId?: number;
  checkpointId?: number;
  plannedMin: number;
}
