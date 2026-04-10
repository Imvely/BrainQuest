import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EmotionCalendarScreen from '../EmotionCalendarScreen';
import { MonthlyCalendarResponse, WeeklySummary } from '../../../types/emotion';

// ---------------------------------------------------------------------------
// Navigation mock
// ---------------------------------------------------------------------------
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

// ---------------------------------------------------------------------------
// Hook mocks
// ---------------------------------------------------------------------------
// 백엔드 MonthlyCalendarResponse: { yearMonth, days: DayEmotionSummary[] }
const mockCalendarData: MonthlyCalendarResponse = {
  yearMonth: '2026-04',
  days: [
    {
      date: '2026-04-01',
      dominantWeather: 'SUNNY',
      recordCount: 2,
      records: [],
    },
    {
      date: '2026-04-02',
      dominantWeather: 'RAIN',
      recordCount: 1,
      records: [],
    },
    {
      date: '2026-04-09',
      dominantWeather: 'CLOUDY',
      recordCount: 1,
      records: [],
    },
  ],
};

// 백엔드 WeeklySummaryResponse: distribution (not weatherDistribution), avgWeatherValue (not avgIntensity),
// no dominantWeather, no topTags
const mockWeeklySummary: WeeklySummary = {
  weekStart: '2026-04-06',
  weekEnd: '2026-04-12',
  totalRecords: 5,
  avgWeatherValue: 5.2,
  distribution: {
    SUNNY: 3,
    RAIN: 1,
    CLOUDY: 1,
    PARTLY_CLOUDY: 0,
    FOG: 0,
    THUNDER: 0,
    STORM: 0,
  },
  comparedToLastWeek: {
    SUNNY: 1,
    RAIN: -1,
    CLOUDY: 0,
    PARTLY_CLOUDY: 0,
    FOG: 0,
    THUNDER: 0,
    STORM: 0,
  },
};

jest.mock('../../../hooks/useEmotions', () => ({
  useEmotionCalendar: () => ({ data: mockCalendarData }),
  useWeeklySummary: () => ({ data: mockWeeklySummary }),
  useEmotionsByDate: () => ({ data: null }),
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('EmotionCalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Renders month display with year and month
  it('renders month display with current year and month', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    const now = new Date();
    const expected = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    expect(getByText(expected)).toBeTruthy();
  });

  // 2. Shows < and > navigation buttons
  it('shows < and > navigation buttons', () => {
    const { getAllByText } = render(<EmotionCalendarScreen />);
    const leftArrows = getAllByText('<');
    const rightArrows = getAllByText('>');
    expect(leftArrows.length).toBeGreaterThan(0);
    expect(rightArrows.length).toBeGreaterThan(0);
  });

  // 3. Tapping > advances to next month
  it('tapping > advances to next month', () => {
    const { getAllByText, getByText } = render(<EmotionCalendarScreen />);
    const now = new Date();
    const rightArrow = getAllByText('>')[0];
    fireEvent.press(rightArrow);

    const nextMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
    const nextYear =
      now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();
    expect(getByText(`${nextYear}년 ${nextMonth}월`)).toBeTruthy();
  });

  // 4. Tapping < goes to previous month
  it('tapping < goes to previous month', () => {
    const { getAllByText, getByText } = render(<EmotionCalendarScreen />);
    const now = new Date();
    const leftArrow = getAllByText('<')[0];
    fireEvent.press(leftArrow);

    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    expect(getByText(`${prevYear}년 ${prevMonth}월`)).toBeTruthy();
  });

  // 5. Shows FAB (+) button for new emotion record
  it('shows FAB (+) button', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    expect(getByText('+')).toBeTruthy();
  });

  // 6. FAB navigates to EmotionRecord
  it('FAB navigates to EmotionRecord when pressed', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    fireEvent.press(getByText('+'));
    expect(mockNavigate).toHaveBeenCalledWith('EmotionRecord');
  });

  // 7. Shows share button "이번 달 감정 날씨 공유"
  it('shows "이번 달 감정 날씨 공유" share button', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    expect(getByText('이번 달 감정 날씨 공유')).toBeTruthy();
  });

  // 8. WeatherCalendar component renders (weekday headers present)
  it('renders WeatherCalendar with weekday headers', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    expect(getByText('일')).toBeTruthy();
    expect(getByText('월')).toBeTruthy();
    expect(getByText('화')).toBeTruthy();
    expect(getByText('수')).toBeTruthy();
    expect(getByText('목')).toBeTruthy();
    expect(getByText('금')).toBeTruthy();
    expect(getByText('토')).toBeTruthy();
  });

  // 9. Renders weekly summary card
  it('renders weekly summary card with title', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    expect(getByText('이번 주 감정 날씨')).toBeTruthy();
  });

  // 10. (삭제) topTags 필드는 백엔드 WeeklySummaryResponse에 없으므로 UI에서 제거됨.

  // 11. Renders BrainQuest watermark
  it('renders BrainQuest watermark in calendar area', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    expect(getByText('BrainQuest')).toBeTruthy();
  });

  // 12. Multiple month navigations work correctly
  it('navigates forward and backward multiple months correctly', () => {
    const { getAllByText, getByText } = render(<EmotionCalendarScreen />);
    const now = new Date();
    const rightArrow = getAllByText('>')[0];
    const leftArrow = getAllByText('<')[0];

    // Go forward 2 months
    fireEvent.press(rightArrow);
    fireEvent.press(rightArrow);

    // Go back 2 months to original
    fireEvent.press(leftArrow);
    fireEvent.press(leftArrow);

    const expected = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    expect(getByText(expected)).toBeTruthy();
  });

  // 13. Weekly summary shows distribution data
  it('shows weather distribution count in weekly summary', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    // SUNNY count = 3
    expect(getByText('3일')).toBeTruthy();
  });

  // 14. Weekly summary share button renders
  it('shows share button in weekly summary card', () => {
    const { getByText } = render(<EmotionCalendarScreen />);
    expect(getByText('공유하기')).toBeTruthy();
  });
});
