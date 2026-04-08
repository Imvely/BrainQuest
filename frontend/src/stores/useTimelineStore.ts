import { create } from 'zustand';
import { TimeBlock } from '../types/timeline';

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

interface TimelineState {
  selectedDate: string;
  blocks: TimeBlock[];
  remainingMin: number;
  nextBlock: TimeBlock | null;
  setSelectedDate: (date: string) => void;
  setBlocks: (blocks: TimeBlock[]) => void;
  addBlock: (block: TimeBlock) => void;
  updateBlock: (id: number, updates: Partial<TimeBlock>) => void;
  removeBlock: (id: number) => void;
  recalcDerived: (sleepTime: string) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  selectedDate: getTodayString(),
  blocks: [],
  remainingMin: 0,
  nextBlock: null,

  setSelectedDate: (date) => set({ selectedDate: date }),

  setBlocks: (blocks) => {
    set({ blocks });
    get().recalcDerived('23:00');
  },

  addBlock: (block) => {
    set((state) => ({ blocks: [...state.blocks, block] }));
    get().recalcDerived('23:00');
  },

  updateBlock: (id, updates) => {
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    }));
    get().recalcDerived('23:00');
  },

  removeBlock: (id) => {
    set((state) => ({ blocks: state.blocks.filter((b) => b.id !== id) }));
    get().recalcDerived('23:00');
  },

  recalcDerived: (sleepTime: string) => {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const sleepMin = parseHHMM(sleepTime);
    const remaining = Math.max(0, sleepMin - nowMin);

    const { blocks } = get();
    const safeBlocks = Array.isArray(blocks) ? blocks : [];
    const sorted = [...safeBlocks]
      .filter((b) => b.status !== 'COMPLETED' && b.status !== 'SKIPPED')
      .sort((a, b) => parseHHMM(a.startTime) - parseHHMM(b.startTime));
    const next = sorted.find((b) => parseHHMM(b.startTime) >= nowMin) ?? null;

    set({ remainingMin: remaining, nextBlock: next });
  },
}));
