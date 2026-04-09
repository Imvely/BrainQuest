import { useGateStore } from '../useGateStore';
import type { CheckinRecord, Medication, MedLog, Streak } from '../../api/gate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetStore() {
  useGateStore.setState({
    todayMorningCheckin: null,
    todayEveningCheckin: null,
    yesterdayEveningCheckin: null,
    streaks: [],
    medications: [],
    todayMedLogs: [],
  });
}

const MOCK_MORNING_CHECKIN: CheckinRecord = {
  id: 1,
  checkinType: 'MORNING',
  checkinDate: '2026-04-09',
  sleepHours: 7.5,
  sleepQuality: 3,
  condition: 4,
  createdAt: '2026-04-09T07:30:00',
};

const MOCK_EVENING_CHECKIN: CheckinRecord = {
  id: 2,
  checkinType: 'EVENING',
  checkinDate: '2026-04-09',
  focusScore: 4,
  impulsivityScore: 2,
  emotionScore: 3,
  memo: '좋은 하루',
  createdAt: '2026-04-09T21:00:00',
};

const MOCK_MED: Medication = {
  id: 10,
  medName: '콘서타',
  dosage: '27mg',
  scheduleTime: '08:00',
  isActive: true,
  createdAt: '2026-01-01T00:00:00',
};

const MOCK_MED_2: Medication = {
  id: 11,
  medName: '스트라테라',
  dosage: '40mg',
  scheduleTime: '09:00',
  isActive: true,
  createdAt: '2026-01-02T00:00:00',
};

const MOCK_LOG: MedLog = {
  id: 100,
  medicationId: 10,
  logDate: '2026-04-09',
  takenAt: '2026-04-09T08:05:00',
};

const MOCK_STREAKS: Streak[] = [
  { streakType: 'CHECKIN', currentCount: 7, maxCount: 14 },
  { streakType: 'BATTLE', currentCount: 3, maxCount: 10 },
  { streakType: 'EMOTION', currentCount: 5, maxCount: 5 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGateStore', () => {
  beforeEach(resetStore);

  // =========================================================================
  // 1. Initial state
  // =========================================================================
  describe('initial state', () => {
    it('has null checkins', () => {
      const s = useGateStore.getState();
      expect(s.todayMorningCheckin).toBeNull();
      expect(s.todayEveningCheckin).toBeNull();
      expect(s.yesterdayEveningCheckin).toBeNull();
    });

    it('has empty arrays', () => {
      const s = useGateStore.getState();
      expect(s.streaks).toEqual([]);
      expect(s.medications).toEqual([]);
      expect(s.todayMedLogs).toEqual([]);
    });
  });

  // =========================================================================
  // 2. setTodayCheckin
  // =========================================================================
  describe('setTodayCheckin', () => {
    it('sets morning checkin', () => {
      useGateStore.getState().setTodayCheckin('MORNING', MOCK_MORNING_CHECKIN);
      expect(useGateStore.getState().todayMorningCheckin).toEqual(MOCK_MORNING_CHECKIN);
      expect(useGateStore.getState().todayEveningCheckin).toBeNull();
    });

    it('sets evening checkin', () => {
      useGateStore.getState().setTodayCheckin('EVENING', MOCK_EVENING_CHECKIN);
      expect(useGateStore.getState().todayEveningCheckin).toEqual(MOCK_EVENING_CHECKIN);
      expect(useGateStore.getState().todayMorningCheckin).toBeNull();
    });

    it('can clear by setting null', () => {
      useGateStore.getState().setTodayCheckin('MORNING', MOCK_MORNING_CHECKIN);
      useGateStore.getState().setTodayCheckin('MORNING', null);
      expect(useGateStore.getState().todayMorningCheckin).toBeNull();
    });
  });

  // =========================================================================
  // 3. setYesterdayEveningCheckin
  // =========================================================================
  describe('setYesterdayEveningCheckin', () => {
    it('sets yesterday evening checkin', () => {
      useGateStore.getState().setYesterdayEveningCheckin(MOCK_EVENING_CHECKIN);
      expect(useGateStore.getState().yesterdayEveningCheckin).toEqual(MOCK_EVENING_CHECKIN);
    });
  });

  // =========================================================================
  // 4. Streaks
  // =========================================================================
  describe('setStreaks', () => {
    it('sets streaks array', () => {
      useGateStore.getState().setStreaks(MOCK_STREAKS);
      expect(useGateStore.getState().streaks).toEqual(MOCK_STREAKS);
      expect(useGateStore.getState().streaks).toHaveLength(3);
    });

    it('overwrites previous streaks', () => {
      useGateStore.getState().setStreaks(MOCK_STREAKS);
      useGateStore.getState().setStreaks([]);
      expect(useGateStore.getState().streaks).toEqual([]);
    });
  });

  // =========================================================================
  // 5. Medications CRUD
  // =========================================================================
  describe('medications', () => {
    it('setMedications replaces array', () => {
      useGateStore.getState().setMedications([MOCK_MED, MOCK_MED_2]);
      expect(useGateStore.getState().medications).toHaveLength(2);
    });

    it('addMedication appends to list', () => {
      useGateStore.getState().setMedications([MOCK_MED]);
      useGateStore.getState().addMedication(MOCK_MED_2);
      expect(useGateStore.getState().medications).toHaveLength(2);
      expect(useGateStore.getState().medications[1].medName).toBe('스트라테라');
    });

    it('removeMedication removes by id', () => {
      useGateStore.getState().setMedications([MOCK_MED, MOCK_MED_2]);
      useGateStore.getState().removeMedication(10);
      expect(useGateStore.getState().medications).toHaveLength(1);
      expect(useGateStore.getState().medications[0].id).toBe(11);
    });

    it('removeMedication does nothing for unknown id', () => {
      useGateStore.getState().setMedications([MOCK_MED]);
      useGateStore.getState().removeMedication(999);
      expect(useGateStore.getState().medications).toHaveLength(1);
    });

    it('updateMedication patches specific medication', () => {
      useGateStore.getState().setMedications([MOCK_MED, MOCK_MED_2]);
      useGateStore.getState().updateMedication(10, { dosage: '36mg', isActive: false });
      const updated = useGateStore.getState().medications.find((m) => m.id === 10);
      expect(updated?.dosage).toBe('36mg');
      expect(updated?.isActive).toBe(false);
      // Other med unchanged
      expect(useGateStore.getState().medications.find((m) => m.id === 11)?.dosage).toBe('40mg');
    });
  });

  // =========================================================================
  // 6. MedLogs CRUD
  // =========================================================================
  describe('todayMedLogs', () => {
    it('setTodayMedLogs replaces array', () => {
      useGateStore.getState().setTodayMedLogs([MOCK_LOG]);
      expect(useGateStore.getState().todayMedLogs).toHaveLength(1);
    });

    it('addMedLog appends', () => {
      useGateStore.getState().setTodayMedLogs([MOCK_LOG]);
      const newLog: MedLog = { id: 101, medicationId: 11, logDate: '2026-04-09', takenAt: '2026-04-09T09:00:00' };
      useGateStore.getState().addMedLog(newLog);
      expect(useGateStore.getState().todayMedLogs).toHaveLength(2);
    });

    it('updateMedLog patches specific log', () => {
      useGateStore.getState().setTodayMedLogs([MOCK_LOG]);
      useGateStore.getState().updateMedLog(100, { effectiveness: 3 });
      expect(useGateStore.getState().todayMedLogs[0].effectiveness).toBe(3);
    });

    it('updateMedLog does not affect other logs', () => {
      const log2: MedLog = { id: 101, medicationId: 11, logDate: '2026-04-09', takenAt: '2026-04-09T09:00:00' };
      useGateStore.getState().setTodayMedLogs([MOCK_LOG, log2]);
      useGateStore.getState().updateMedLog(100, { effectiveness: 2 });
      expect(useGateStore.getState().todayMedLogs[1].effectiveness).toBeUndefined();
    });
  });

  // =========================================================================
  // 7. getCheckinStreak
  // =========================================================================
  describe('getCheckinStreak', () => {
    it('returns 0 when no streaks', () => {
      expect(useGateStore.getState().getCheckinStreak()).toBe(0);
    });

    it('returns CHECKIN streak count', () => {
      useGateStore.getState().setStreaks(MOCK_STREAKS);
      expect(useGateStore.getState().getCheckinStreak()).toBe(7);
    });

    it('returns 0 when CHECKIN streak not present', () => {
      useGateStore.getState().setStreaks([
        { streakType: 'BATTLE', currentCount: 3, maxCount: 10 },
      ]);
      expect(useGateStore.getState().getCheckinStreak()).toBe(0);
    });
  });
});
