import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EmotionCalendarScreen from '../EmotionCalendarScreen';
import { EmotionCalendarDay, WeeklySummary } from '../../../types/emotion';

// --- Navigation mock ---
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
}));

// --- Hook mocks ---
const mockCalendarData: EmotionCalendarDay[] = [
  { date: '2026-04-01', weatherType: 'SUNNY', avgIntensity: 4, count: 2 },
  { date: '2026-04-02', weatherType: 'RAIN', avgIntensity: 3, count: 1 },
  { date: '2026-04-09', weatherType: 'CLOUDY', avgIntensity: 2, count: 1 },
];

const mockWeeklySummary: WeeklySummary = {
  weekStart: '2026-04-06',
  weekEnd: '2026-04-12',
  dominantWeather: 'SUNNY',
  avgIntensity: 3.5,
  totalRecords: 5,
  weatherDistribution: { SUNNY: 3, RAIN: 1, CLOUDY: 1, PARTLY_CLOUDY: 0, FOG: 0, THUNDER: 0, STORM: 0 },
  comparedToLastWeek: { SUNNY: 1, RAIN: -1, CLOUDY: 0, PARTLY_CLOUDY: 0, FOG: 0, THUNDER: 0, STORM: 0 },
  topTags: ['피곤', '운동후'],
};

jest.mock('../../../hooks/useEmotions', () => ({
  useEmotionCalendar: () => ({ data: mockCalendarData }),
  useWeeklySummary: () => ({ data: mockWeeklySummary }),
  useEmotionsByDate: () => ({ data: null }),
}));

// --- Helpers ---
function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('EmotionCalendarScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders month title with current date', () => {
    const { getByText } = renderWithProviders(<EmotionCalendarScreen />);
    const now = new Date();
    const expected = `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
    expect(getByText(expected)).toBeTruthy();
  });

  it('renders weekday headers', () => {
    const { getByText } = renderWithProviders(<EmotionCalendarScreen />);
    expect(getByText('일')).toBeTruthy();
    expect(getByText('월')).toBeTruthy();
    expect(getByText('화')).toBeTruthy();
    expect(getByText('수')).toBeTruthy();
    expect(getByText('목')).toBeTruthy();
    expect(getByText('금')).toBeTruthy();
    expect(getByText('토')).toBeTruthy();
  });

  it('renders month navigation arrows', () => {
    const { getAllByText } = renderWithProviders(<EmotionCalendarScreen />);
    const arrows = getAllByText('<');
    expect(arrows.length).toBeGreaterThan(0);
  });

  it('navigates months with arrows', () => {
    const { getAllByText, getByText } = renderWithProviders(<EmotionCalendarScreen />);
    const now = new Date();

    // Press next month
    const rightArrow = getAllByText('>')[0];
    fireEvent.press(rightArrow);
    const nextMonth = now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2;
    const nextYear = now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear();
    expect(getByText(`${nextYear}년 ${nextMonth}월`)).toBeTruthy();
  });

  it('renders weekly summary card', () => {
    const { getByText } = renderWithProviders(<EmotionCalendarScreen />);
    expect(getByText('이번 주 감정 날씨')).toBeTruthy();
    expect(getByText('3일')).toBeTruthy(); // SUNNY count
    expect(getByText('공유하기')).toBeTruthy();
  });

  it('renders top tags in weekly summary', () => {
    const { getByText } = renderWithProviders(<EmotionCalendarScreen />);
    expect(getByText('#피곤')).toBeTruthy();
    expect(getByText('#운동후')).toBeTruthy();
  });

  it('renders monthly share link', () => {
    const { getByText } = renderWithProviders(<EmotionCalendarScreen />);
    expect(getByText('이번 달 감정 날씨 공유')).toBeTruthy();
  });

  it('renders FAB button that navigates to EmotionRecord', () => {
    const { getByText } = renderWithProviders(<EmotionCalendarScreen />);
    const fab = getByText('+');
    fireEvent.press(fab);
    expect(mockNavigate).toHaveBeenCalledWith('EmotionRecord');
  });

  it('renders BrainQuest watermark', () => {
    const { getByText } = renderWithProviders(<EmotionCalendarScreen />);
    expect(getByText('BrainQuest')).toBeTruthy();
  });
});
