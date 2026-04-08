import { create } from 'zustand';
import { BattleSession } from '../types/battle';

interface BattleState {
  session: BattleSession | null;
  combo: number;
  isExited: boolean;
  elapsedSec: number;
  setSession: (session: BattleSession | null) => void;
  setCombo: (combo: number) => void;
  setIsExited: (isExited: boolean) => void;
  setElapsedSec: (sec: number) => void;
  reset: () => void;
}

export const useBattleStore = create<BattleState>((set) => ({
  session: null,
  combo: 0,
  isExited: false,
  elapsedSec: 0,

  setSession: (session) => set({ session }),
  setCombo: (combo) => set({ combo }),
  setIsExited: (isExited) => set({ isExited }),
  setElapsedSec: (sec) => set({ elapsedSec: sec }),

  reset: () =>
    set({ session: null, combo: 0, isExited: false, elapsedSec: 0 }),
}));
