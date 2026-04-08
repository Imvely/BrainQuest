import { create } from 'zustand';
import { EmotionRecord, EmotionCalendarDay, WeeklySummary } from '../types/emotion';

interface EmotionState {
  recentRecords: EmotionRecord[];
  calendar: EmotionCalendarDay[];
  weeklySummary: WeeklySummary | null;
  setRecentRecords: (records: EmotionRecord[]) => void;
  setCalendar: (days: EmotionCalendarDay[]) => void;
  setWeeklySummary: (summary: WeeklySummary) => void;
  addRecord: (record: EmotionRecord) => void;
}

export const useEmotionStore = create<EmotionState>((set) => ({
  recentRecords: [],
  calendar: [],
  weeklySummary: null,

  setRecentRecords: (records) => set({ recentRecords: records }),
  setCalendar: (days) => set({ calendar: days }),
  setWeeklySummary: (summary) => set({ weeklySummary: summary }),

  addRecord: (record) =>
    set((state) => ({
      recentRecords: [record, ...state.recentRecords],
    })),
}));
