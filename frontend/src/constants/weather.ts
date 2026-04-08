export type WeatherType =
  | 'SUNNY'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'FOG'
  | 'RAIN'
  | 'THUNDER'
  | 'STORM';

export const WEATHER_CONFIG: Record<WeatherType, {
  value: number;
  label: string;
  emoji: string;
  color: string;
}> = {
  SUNNY:         { value: 7, label: '기쁨',   emoji: '☀️', color: '#FDCB6E' },
  PARTLY_CLOUDY: { value: 6, label: '평온',   emoji: '⛅', color: '#74B9FF' },
  CLOUDY:        { value: 5, label: '무기력', emoji: '☁️', color: '#A0A0C0' },
  FOG:           { value: 4, label: '혼란',   emoji: '🌫️', color: '#B2BEC3' },
  RAIN:          { value: 3, label: '슬픔',   emoji: '🌧️', color: '#0984E3' },
  THUNDER:       { value: 2, label: '분노',   emoji: '⛈️', color: '#E17055' },
  STORM:         { value: 1, label: '폭발',   emoji: '🌪️', color: '#D63031' },
};

export const WEATHER_TYPES = Object.keys(WEATHER_CONFIG) as WeatherType[];
