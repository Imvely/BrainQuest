import { create } from 'zustand';
import { EmotionRecord, EmotionCalendarDay, WeeklySummary } from '../types/emotion';
import { WeatherType } from '../constants/weather';

interface EmotionState {
  recentRecords: EmotionRecord[];
  todayCount: number;
  recentWeather: WeatherType | null;
  calendar: EmotionCalendarDay[];
  weeklySummary: WeeklySummary | null;
  setRecentRecords: (records: EmotionRecord[]) => void;
  setTodayCount: (count: number) => void;
  setCalendar: (days: EmotionCalendarDay[]) => void;
  setWeeklySummary: (summary: WeeklySummary) => void;
  addRecord: (record: EmotionRecord) => void;
}

export const useEmotionStore = create<EmotionState>((set) => ({
  recentRecords: [],
  todayCount: 0,
  recentWeather: null,
  calendar: [],
  weeklySummary: null,

  setRecentRecords: (records) => set({ recentRecords: records }),
  setTodayCount: (count) => set({ todayCount: count }),
  setCalendar: (days) => set({ calendar: days }),
  setWeeklySummary: (summary) => set({ weeklySummary: summary }),

  addRecord: (record) =>
    set((state) => ({
      recentRecords: [record, ...state.recentRecords],
      todayCount: state.todayCount + 1,
      recentWeather: record.weatherType,
    })),
}));
