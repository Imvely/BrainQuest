import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import WeatherCalendar from '../WeatherCalendar';
import { EmotionCalendarDay } from '../../../types/emotion';

const mockOnDateSelect = jest.fn();

const sampleData: EmotionCalendarDay[] = [
  { date: '2026-04-01', weatherType: 'SUNNY', avgIntensity: 4, count: 2 },
  { date: '2026-04-05', weatherType: 'RAIN', avgIntensity: 3, count: 1 },
  { date: '2026-04-15', weatherType: 'CLOUDY', avgIntensity: 2, count: 3 },
];

describe('WeatherCalendar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(
      <WeatherCalendar yearMonth="2026-04" data={[]} onDateSelect={mockOnDateSelect} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders weekday headers', () => {
    const { getByText } = render(
      <WeatherCalendar yearMonth="2026-04" data={[]} onDateSelect={mockOnDateSelect} />,
    );
    ['일', '월', '화', '수', '목', '금', '토'].forEach((day) => {
      expect(getByText(day)).toBeTruthy();
    });
  });

  it('renders day numbers for the month', () => {
    const { getByText } = render(
      <WeatherCalendar yearMonth="2026-04" data={[]} onDateSelect={mockOnDateSelect} />,
    );
    // April 2026 has 30 days
    expect(getByText('1')).toBeTruthy();
    expect(getByText('15')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
  });

  it('shows dash for days without data', () => {
    const { getAllByText } = render(
      <WeatherCalendar yearMonth="2026-04" data={[]} onDateSelect={mockOnDateSelect} />,
    );
    const dashes = getAllByText('—');
    expect(dashes.length).toBe(30); // all 30 days show dashes
  });

  it('shows weather emoji for days with data', () => {
    const { getByText } = render(
      <WeatherCalendar yearMonth="2026-04" data={sampleData} onDateSelect={mockOnDateSelect} />,
    );
    expect(getByText('☀️')).toBeTruthy(); // SUNNY on Apr 1
    expect(getByText('🌧️')).toBeTruthy(); // RAIN on Apr 5
    expect(getByText('☁️')).toBeTruthy(); // CLOUDY on Apr 15
  });

  it('shows count badge for days with multiple records', () => {
    const { getAllByText } = render(
      <WeatherCalendar yearMonth="2026-04" data={sampleData} onDateSelect={mockOnDateSelect} />,
    );
    // '2' appears as both day-number (Apr 2) and count badge (Apr 1 count=2)
    // '3' appears as both day-number (Apr 3) and count badge (Apr 15 count=3)
    // Just verify they exist (multiple matches expected)
    expect(getAllByText('2').length).toBeGreaterThanOrEqual(2);
    expect(getAllByText('3').length).toBeGreaterThanOrEqual(2);
  });

  it('calls onDateSelect when a day with data is tapped', () => {
    const { getByText } = render(
      <WeatherCalendar yearMonth="2026-04" data={sampleData} onDateSelect={mockOnDateSelect} />,
    );
    fireEvent.press(getByText('☀️'));
    expect(mockOnDateSelect).toHaveBeenCalledWith('2026-04-01');
  });

  it('does not call onDateSelect for days without data', () => {
    const { getByText } = render(
      <WeatherCalendar yearMonth="2026-04" data={sampleData} onDateSelect={mockOnDateSelect} />,
    );
    // Day 10 has no data - tapping the day number should not trigger callback
    // (the TouchableOpacity is disabled when no data)
    fireEvent.press(getByText('10'));
    expect(mockOnDateSelect).not.toHaveBeenCalled();
  });

  it('renders correctly for different months', () => {
    const { getByText } = render(
      <WeatherCalendar yearMonth="2026-02" data={[]} onDateSelect={mockOnDateSelect} />,
    );
    // February 2026 has 28 days (not leap year)
    expect(getByText('28')).toBeTruthy();
  });

  it('handles empty data gracefully', () => {
    const { toJSON } = render(
      <WeatherCalendar yearMonth="2026-01" data={[]} onDateSelect={mockOnDateSelect} />,
    );
    expect(toJSON()).toBeTruthy();
  });
});
