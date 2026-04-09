export type BattleResult = 'VICTORY' | 'DEFEAT' | 'ABANDON';
export type PenaltyType = 'COMBO_RESET' | 'HP_RECOVER' | 'HP_DAMAGE' | 'DEFEAT';
export type BattlePhase = 'SETUP' | 'COUNTDOWN' | 'FIGHTING' | 'RESULT';

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

export interface BattleEndRequest {
  result: BattleResult;
  maxCombo: number;
}

export interface BattleEndResponse {
  expEarned: number;
  goldEarned: number;
  itemDrops: ItemDrop[];
  levelUp: boolean;
  newLevel?: number;
  checkpointCompleted: boolean;
}

export interface BattleExitResponse {
  penaltyType: PenaltyType;
  monsterRemainingHp: number;
}

export interface BattleReturnResponse {
  penaltyType: PenaltyType;
  monsterRemainingHp: number;
  remainingSeconds: number;
}
