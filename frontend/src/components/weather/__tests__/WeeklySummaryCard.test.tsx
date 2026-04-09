import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WeeklySummaryCard from '../WeeklySummaryCard';
import { WeeklySummary } from '../../../types/emotion';

const mockSummary: WeeklySummary = {
  weekStart: '2026-04-06',
  weekEnd: '2026-04-12',
  dominantWeather: 'SUNNY',
  avgIntensity: 3.5,
  totalRecords: 7,
  weatherDistribution: {
    SUNNY: 3, PARTLY_CLOUDY: 0, CLOUDY: 2, FOG: 0,
    RAIN: 1, THUNDER: 1, STORM: 0,
  },
  comparedToLastWeek: {
    SUNNY: 1, PARTLY_CLOUDY: 0, CLOUDY: -1, FOG: 0,
    RAIN: 0, THUNDER: 1, STORM: 0,
  },
  topTags: ['피곤', '운동후', '업무중'],
};

describe('WeeklySummaryCard', () => {
  const mockOnShare = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders title', () => {
    const { getByText } = render(
      <WeeklySummaryCard summary={mockSummary} />,
    );
    expect(getByText('이번 주 감정 날씨')).toBeTruthy();
  });

  it('shows empty state when summary is null', () => {
    const { getByText } = render(
      <WeeklySummaryCard summary={null} />,
    );
    expect(getByText('이번 주 기록이 없어요')).toBeTruthy();
  });

  it('shows empty state when totalRecords is 0', () => {
    const empty = { ...mockSummary, totalRecords: 0 };
    const { getByText } = render(
      <WeeklySummaryCard summary={empty} />,
    );
    expect(getByText('이번 주 기록이 없어요')).toBeTruthy();
  });

  it('displays period range', () => {
    const { getByText } = render(
      <WeeklySummaryCard summary={mockSummary} />,
    );
    expect(getByText('2026-04-06 ~ 2026-04-12')).toBeTruthy();
  });

  it('displays weather distribution counts', () => {
    const { getByText, getAllByText } = render(
      <WeeklySummaryCard summary={mockSummary} />,
    );
    expect(getByText('3일')).toBeTruthy(); // SUNNY
    expect(getByText('2일')).toBeTruthy(); // CLOUDY
    // '1일' appears twice (RAIN=1 and THUNDER=1)
    expect(getAllByText('1일').length).toBe(2);
  });

  it('shows weather emojis for non-zero types', () => {
    const { getByText } = render(
      <WeeklySummaryCard summary={mockSummary} />,
    );
    expect(getByText('☀️')).toBeTruthy();
    expect(getByText('☁️')).toBeTruthy();
    expect(getByText('🌧️')).toBeTruthy();
    expect(getByText('⛈️')).toBeTruthy();
  });

  it('shows positive diff from last week', () => {
    const { getAllByText } = render(
      <WeeklySummaryCard summary={mockSummary} />,
    );
    // +1 appears for both SUNNY and THUNDER
    expect(getAllByText('+1').length).toBeGreaterThanOrEqual(1);
  });

  it('shows negative diff from last week', () => {
    const { getByText } = render(
      <WeeklySummaryCard summary={mockSummary} />,
    );
    expect(getByText('-1')).toBeTruthy(); // CLOUDY decreased by 1
  });

  it('displays top tags with # prefix', () => {
    const { getByText } = render(
      <WeeklySummaryCard summary={mockSummary} />,
    );
    expect(getByText('#피곤')).toBeTruthy();
    expect(getByText('#운동후')).toBeTruthy();
    expect(getByText('#업무중')).toBeTruthy();
  });

  it('limits top tags to 3', () => {
    const withManyTags = {
      ...mockSummary,
      topTags: ['a', 'b', 'c', 'd', 'e'],
    };
    const { queryByText } = render(
      <WeeklySummaryCard summary={withManyTags} />,
    );
    expect(queryByText('#a')).toBeTruthy();
    expect(queryByText('#c')).toBeTruthy();
    expect(queryByText('#d')).toBeNull();
  });

  it('renders share button when onShare is provided', () => {
    const { getByText } = render(
      <WeeklySummaryCard summary={mockSummary} onShare={mockOnShare} />,
    );
    expect(getByText('공유하기')).toBeTruthy();
  });

  it('calls onShare when share button pressed', () => {
    const { getByText } = render(
      <WeeklySummaryCard summary={mockSummary} onShare={mockOnShare} />,
    );
    fireEvent.press(getByText('공유하기'));
    expect(mockOnShare).toHaveBeenCalledTimes(1);
  });

  it('hides share button when onShare not provided', () => {
    const { queryByText } = render(
      <WeeklySummaryCard summary={mockSummary} />,
    );
    expect(queryByText('공유하기')).toBeNull();
  });

  it('hides tags section when topTags is empty', () => {
    const noTags = { ...mockSummary, topTags: [] };
    const { queryByText } = render(
      <WeeklySummaryCard summary={noTags} />,
    );
    expect(queryByText('#')).toBeNull();
  });
});
