import { create } from 'zustand';
import type { CheckinRecord, Medication, MedLog, Streak } from '../api/gate';

interface GateState {
  todayMorningCheckin: CheckinRecord | null;
  todayEveningCheckin: CheckinRecord | null;
  yesterdayEveningCheckin: CheckinRecord | null;
  streaks: Streak[];
  medications: Medication[];
  todayMedLogs: MedLog[];

  setTodayCheckin: (type: 'MORNING' | 'EVENING', record: CheckinRecord | null) => void;
  setYesterdayEveningCheckin: (record: CheckinRecord | null) => void;
  setStreaks: (streaks: Streak[]) => void;
  setMedications: (medications: Medication[]) => void;
  addMedication: (medication: Medication) => void;
  removeMedication: (id: number) => void;
  updateMedication: (id: number, updates: Partial<Medication>) => void;
  setTodayMedLogs: (logs: MedLog[]) => void;
  addMedLog: (log: MedLog) => void;
  updateMedLog: (id: number, updates: Partial<MedLog>) => void;
  getCheckinStreak: () => number;
}

export const useGateStore = create<GateState>((set, get) => ({
  todayMorningCheckin: null,
  todayEveningCheckin: null,
  yesterdayEveningCheckin: null,
  streaks: [],
  medications: [],
  todayMedLogs: [],

  setTodayCheckin: (type, record) =>
    set(type === 'MORNING' ? { todayMorningCheckin: record } : { todayEveningCheckin: record }),

  setYesterdayEveningCheckin: (record) => set({ yesterdayEveningCheckin: record }),

  setStreaks: (streaks) => set({ streaks }),

  setMedications: (medications) => set({ medications }),

  addMedication: (medication) =>
    set((s) => ({ medications: [...s.medications, medication] })),

  removeMedication: (id) =>
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) })),

  updateMedication: (id, updates) =>
    set((s) => ({
      medications: s.medications.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),

  setTodayMedLogs: (logs) => set({ todayMedLogs: logs }),

  addMedLog: (log) =>
    set((s) => ({ todayMedLogs: [...s.todayMedLogs, log] })),

  updateMedLog: (id, updates) =>
    set((s) => ({
      todayMedLogs: s.todayMedLogs.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),

  getCheckinStreak: () => {
    const streak = get().streaks.find((s) => s.streakType === 'CHECKIN');
    return streak?.currentCount ?? 0;
  },
}));
