import { useEmotionStore } from '../useEmotionStore';
import { EmotionRecord, WeeklySummary } from '../../types/emotion';

const mockRecord: EmotionRecord = {
  id: 1,
  userId: 1,
  weatherType: 'SUNNY',
  intensity: 4,
  tags: ['좋은날'],
  memo: '기분 좋다',
  recordedAt: '2026-04-08T10:00:00',
  createdAt: '2026-04-08T10:00:00',
};

const mockSummary: WeeklySummary = {
  weekStart: '2026-04-01',
  weekEnd: '2026-04-07',
  dominantWeather: 'PARTLY_CLOUDY',
  avgIntensity: 3.5,
  totalRecords: 10,
  weatherDistribution: {
    SUNNY: 3,
    PARTLY_CLOUDY: 4,
    CLOUDY: 2,
    FOG: 0,
    RAIN: 1,
    THUNDER: 0,
    STORM: 0,
  },
  topTags: ['피곤', '회의후'],
};

describe('useEmotionStore', () => {
  beforeEach(() => {
    useEmotionStore.setState({
      recentRecords: [],
      todayCount: 0,
      recentWeather: null,
      calendar: [],
      weeklySummary: null,
    });
  });

  describe('addRecord', () => {
    it('prepends a record to recentRecords', () => {
      const record2 = { ...mockRecord, id: 2, weatherType: 'RAIN' as const };
      useEmotionStore.getState().setRecentRecords([mockRecord]);
      useEmotionStore.getState().addRecord(record2);
      const records = useEmotionStore.getState().recentRecords;
      expect(records).toHaveLength(2);
      expect(records[0].id).toBe(2);
    });

    it('increments todayCount', () => {
      expect(useEmotionStore.getState().todayCount).toBe(0);
      useEmotionStore.getState().addRecord(mockRecord);
      expect(useEmotionStore.getState().todayCount).toBe(1);
      useEmotionStore.getState().addRecord({ ...mockRecord, id: 2 });
      expect(useEmotionStore.getState().todayCount).toBe(2);
    });

    it('updates recentWeather', () => {
      expect(useEmotionStore.getState().recentWeather).toBeNull();
      useEmotionStore.getState().addRecord(mockRecord);
      expect(useEmotionStore.getState().recentWeather).toBe('SUNNY');

      const rainRecord = { ...mockRecord, id: 2, weatherType: 'RAIN' as const };
      useEmotionStore.getState().addRecord(rainRecord);
      expect(useEmotionStore.getState().recentWeather).toBe('RAIN');
    });
  });

  describe('setTodayCount', () => {
    it('sets the today count directly', () => {
      useEmotionStore.getState().setTodayCount(3);
      expect(useEmotionStore.getState().todayCount).toBe(3);
    });
  });

  describe('setCalendar', () => {
    it('sets calendar days', () => {
      const days = [{ date: '2026-04-08', weatherType: 'SUNNY' as const, avgIntensity: 4, count: 2 }];
      useEmotionStore.getState().setCalendar(days);
      expect(useEmotionStore.getState().calendar).toHaveLength(1);
    });
  });

  describe('setWeeklySummary', () => {
    it('sets the weekly summary', () => {
      useEmotionStore.getState().setWeeklySummary(mockSummary);
      expect(useEmotionStore.getState().weeklySummary).toEqual(mockSummary);
    });
  });
});
