import { useEmotionStore } from '../useEmotionStore';
import { EmotionRecord, EmotionCalendarDay, WeeklySummary } from '../../types/emotion';

const createMockRecord = (id: number, weatherType = 'SUNNY' as const): EmotionRecord => ({
  id,
  userId: 1,
  weatherType,
  intensity: 3,
  recordedAt: '2024-01-01T12:00:00',
  createdAt: '2024-01-01T12:00:00',
});

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

  it('has correct initial state', () => {
    const state = useEmotionStore.getState();
    expect(state.recentRecords).toEqual([]);
    expect(state.todayCount).toBe(0);
    expect(state.recentWeather).toBeNull();
    expect(state.calendar).toEqual([]);
    expect(state.weeklySummary).toBeNull();
  });

  it('setRecentRecords replaces records', () => {
    const records = [createMockRecord(1), createMockRecord(2)];
    useEmotionStore.getState().setRecentRecords(records);
    expect(useEmotionStore.getState().recentRecords).toHaveLength(2);
  });

  it('setTodayCount updates count', () => {
    useEmotionStore.getState().setTodayCount(3);
    expect(useEmotionStore.getState().todayCount).toBe(3);
  });

  it('setCalendar replaces calendar days', () => {
    const days: EmotionCalendarDay[] = [
      { date: '2024-01-01', weatherType: 'SUNNY', avgIntensity: 3, count: 2 },
    ];
    useEmotionStore.getState().setCalendar(days);
    expect(useEmotionStore.getState().calendar).toHaveLength(1);
    expect(useEmotionStore.getState().calendar[0].weatherType).toBe('SUNNY');
  });

  it('setWeeklySummary stores summary', () => {
    const summary: WeeklySummary = {
      weekStart: '2024-01-01',
      weekEnd: '2024-01-07',
      dominantWeather: 'SUNNY',
      avgIntensity: 3.5,
      totalRecords: 10,
      weatherDistribution: {
        SUNNY: 5,
        PARTLY_CLOUDY: 2,
        CLOUDY: 1,
        FOG: 1,
        RAIN: 1,
        THUNDER: 0,
        STORM: 0,
      },
      topTags: ['피곤', '운동후'],
    };
    useEmotionStore.getState().setWeeklySummary(summary);
    expect(useEmotionStore.getState().weeklySummary).toEqual(summary);
  });

  it('addRecord prepends record, increments todayCount, and updates recentWeather', () => {
    useEmotionStore.getState().setRecentRecords([createMockRecord(1)]);
    useEmotionStore.getState().setTodayCount(1);

    const newRecord = createMockRecord(2, 'RAIN');
    useEmotionStore.getState().addRecord(newRecord);

    const state = useEmotionStore.getState();
    expect(state.recentRecords).toHaveLength(2);
    expect(state.recentRecords[0].id).toBe(2);
    expect(state.todayCount).toBe(2);
    expect(state.recentWeather).toBe('RAIN');
  });
});
