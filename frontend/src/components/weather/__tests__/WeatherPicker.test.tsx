import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import WeatherPicker from '../WeatherPicker';
import { WEATHER_CONFIG, WeatherType } from '../../../constants/weather';

describe('WeatherPicker', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  it('renders all 7 weather options', () => {
    const { getByText } = render(
      <WeatherPicker selected={null} onSelect={mockOnSelect} />,
    );
    expect(getByText('맑음')).toBeTruthy();
    expect(getByText('구름 약간')).toBeTruthy();
    expect(getByText('흐림')).toBeTruthy();
    expect(getByText('안개')).toBeTruthy();
    expect(getByText('비')).toBeTruthy();
    expect(getByText('번개')).toBeTruthy();
    expect(getByText('폭풍')).toBeTruthy();
  });

  it('renders emojis for all weather types', () => {
    const { getByText } = render(
      <WeatherPicker selected={null} onSelect={mockOnSelect} />,
    );
    Object.values(WEATHER_CONFIG).forEach((config) => {
      expect(getByText(config.emoji)).toBeTruthy();
    });
  });

  it('calls onSelect with correct type when tapped', () => {
    const { getByText } = render(
      <WeatherPicker selected={null} onSelect={mockOnSelect} />,
    );
    fireEvent.press(getByText('맑음'));
    expect(mockOnSelect).toHaveBeenCalledWith('SUNNY');
  });

  it('triggers haptics on selection', () => {
    const { getByText } = render(
      <WeatherPicker selected={null} onSelect={mockOnSelect} />,
    );
    fireEvent.press(getByText('비'));
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
  });

  it('can select each weather type', () => {
    const types: WeatherType[] = ['SUNNY', 'PARTLY_CLOUDY', 'CLOUDY', 'FOG', 'RAIN', 'THUNDER', 'STORM'];
    const labels = types.map((t) => WEATHER_CONFIG[t].label);

    const { getByText } = render(
      <WeatherPicker selected={null} onSelect={mockOnSelect} />,
    );

    labels.forEach((label, idx) => {
      fireEvent.press(getByText(label));
      expect(mockOnSelect).toHaveBeenCalledWith(types[idx]);
    });
    expect(mockOnSelect).toHaveBeenCalledTimes(7);
  });

  it('renders with a pre-selected weather', () => {
    const { toJSON } = render(
      <WeatherPicker selected="RAIN" onSelect={mockOnSelect} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('renders without crashing when selected is null', () => {
    const { toJSON } = render(
      <WeatherPicker selected={null} onSelect={mockOnSelect} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('has 4 items in first row and 3 in second row', () => {
    const { getByText } = render(
      <WeatherPicker selected={null} onSelect={mockOnSelect} />,
    );
    // Row 1: SUNNY, PARTLY_CLOUDY, CLOUDY, FOG
    expect(getByText('맑음')).toBeTruthy();
    expect(getByText('구름 약간')).toBeTruthy();
    expect(getByText('흐림')).toBeTruthy();
    expect(getByText('안개')).toBeTruthy();
    // Row 2: RAIN, THUNDER, STORM
    expect(getByText('비')).toBeTruthy();
    expect(getByText('번개')).toBeTruthy();
    expect(getByText('폭풍')).toBeTruthy();
  });
});
