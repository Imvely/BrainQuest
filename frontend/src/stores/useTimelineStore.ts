import { create } from 'zustand';
import { TimeBlock } from '../types/timeline';

function getTodayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface TimelineState {
  selectedDate: string;
  blocks: TimeBlock[];
  setSelectedDate: (date: string) => void;
  setBlocks: (blocks: TimeBlock[]) => void;
  addBlock: (block: TimeBlock) => void;
  updateBlock: (id: number, updates: Partial<TimeBlock>) => void;
  removeBlock: (id: number) => void;
}

export const useTimelineStore = create<TimelineState>((set) => ({
  selectedDate: getTodayString(),
  blocks: [],

  setSelectedDate: (date) => set({ selectedDate: date }),
  setBlocks: (blocks) => set({ blocks }),

  addBlock: (block) =>
    set((state) => ({ blocks: [...state.blocks, block] })),

  updateBlock: (id, updates) =>
    set((state) => ({
      blocks: state.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    })),

  removeBlock: (id) =>
    set((state) => ({
      blocks: state.blocks.filter((b) => b.id !== id),
    })),
}));
