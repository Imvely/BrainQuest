import { create } from 'zustand';
import {
  BattlePhase,
  BattleResult,
  BattleSession,
  ItemDrop,
  PenaltyType,
} from '../types/battle';
import { MAX_COMBO } from '../constants/game';

interface BattleState {
  phase: BattlePhase;
  sessionId: number | null;
  questId: number | null;
  checkpointId: number | null;
  plannedMin: number;
  remainingSeconds: number;
  startedAt: number | null;

  monsterType: string;
  monsterMaxHp: number;
  monsterRemainingHp: number;

  characterHp: number;
  characterMaxHp: number;

  comboCount: number;
  maxCombo: number;
  exitCount: number;
  totalExitSec: number;

  result: BattleResult | null;
  expEarned: number;
  goldEarned: number;
  itemDrops: ItemDrop[];
  levelUp: boolean;
  newLevel: number | null;
  checkpointCompleted: boolean;
  isPerfectFocus: boolean;

  lastPenalty: PenaltyType | null;

  setPhase: (phase: BattlePhase) => void;
  setPlannedMin: (min: number) => void;
  setRemainingSeconds: (sec: number) => void;
  startFighting: (session: BattleSession) => void;
  incrementCombo: () => void;
  applyDamage: (damage: number) => void;
  handleExit: () => void;
  handleReturn: (penalty: PenaltyType, monsterHp: number, charHp?: number) => void;
  setResult: (data: {
    result: BattleResult;
    expEarned: number;
    goldEarned: number;
    itemDrops: ItemDrop[];
    levelUp: boolean;
    newLevel?: number;
    checkpointCompleted: boolean;
  }) => void;
  reset: () => void;
}

const initialState = {
  phase: 'SETUP' as BattlePhase,
  sessionId: null as number | null,
  questId: null as number | null,
  checkpointId: null as number | null,
  plannedMin: 25,
  remainingSeconds: 0,
  startedAt: null as number | null,
  monsterType: '',
  monsterMaxHp: 0,
  monsterRemainingHp: 0,
  characterHp: 100,
  characterMaxHp: 100,
  comboCount: 0,
  maxCombo: 0,
  exitCount: 0,
  totalExitSec: 0,
  result: null as BattleResult | null,
  expEarned: 0,
  goldEarned: 0,
  itemDrops: [] as ItemDrop[],
  levelUp: false,
  newLevel: null as number | null,
  checkpointCompleted: false,
  isPerfectFocus: false,
  lastPenalty: null as PenaltyType | null,
};

export const useBattleStore = create<BattleState>((set, get) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setPlannedMin: (min) => set({ plannedMin: min }),
  setRemainingSeconds: (sec) => set({ remainingSeconds: sec }),

  startFighting: (session) =>
    set({
      phase: 'FIGHTING',
      sessionId: session.id,
      questId: session.questId ?? null,
      checkpointId: session.checkpointId ?? null,
      monsterType: session.monsterType,
      monsterMaxHp: session.monsterMaxHp,
      monsterRemainingHp: session.monsterMaxHp,
      remainingSeconds: get().plannedMin * 60,
      startedAt: Date.now(),
      comboCount: 0,
      maxCombo: 0,
      exitCount: 0,
      totalExitSec: 0,
    }),

  incrementCombo: () => {
    const { comboCount, maxCombo } = get();
    const next = Math.min(comboCount + 1, MAX_COMBO);
    set({ comboCount: next, maxCombo: Math.max(maxCombo, next) });
  },

  applyDamage: (damage) => {
    const { monsterRemainingHp } = get();
    set({ monsterRemainingHp: Math.max(0, monsterRemainingHp - damage) });
  },

  handleExit: () =>
    set((s) => ({ exitCount: s.exitCount + 1 })),

  handleReturn: (penalty, monsterHp, charHp) =>
    set({
      lastPenalty: penalty,
      comboCount: 0,
      monsterRemainingHp: monsterHp,
      ...(charHp !== undefined && { characterHp: charHp }),
    }),

  setResult: (data) =>
    set({
      phase: 'RESULT',
      result: data.result,
      expEarned: data.expEarned,
      goldEarned: data.goldEarned,
      itemDrops: data.itemDrops,
      levelUp: data.levelUp,
      newLevel: data.newLevel ?? null,
      checkpointCompleted: data.checkpointCompleted,
      isPerfectFocus: get().exitCount === 0 && data.result === 'VICTORY',
    }),

  reset: () => set(initialState),
}));
