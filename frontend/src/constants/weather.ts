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
  bgColor: string;
}> = {
  SUNNY:         { value: 7, label: '맑음',     emoji: '☀️', color: '#FDCB6E', bgColor: 'rgba(253, 203, 110, 0.15)' },
  PARTLY_CLOUDY: { value: 6, label: '구름 약간', emoji: '⛅', color: '#74B9FF', bgColor: 'rgba(116, 185, 255, 0.12)' },
  CLOUDY:        { value: 5, label: '흐림',     emoji: '☁️', color: '#A0A0C0', bgColor: 'rgba(160, 160, 192, 0.12)' },
  FOG:           { value: 4, label: '안개',     emoji: '🌫️', color: '#B2BEC3', bgColor: 'rgba(178, 190, 195, 0.10)' },
  RAIN:          { value: 3, label: '비',       emoji: '🌧️', color: '#0984E3', bgColor: 'rgba(9, 132, 227, 0.15)' },
  THUNDER:       { value: 2, label: '번개',     emoji: '⛈️', color: '#E17055', bgColor: 'rgba(225, 112, 85, 0.15)' },
  STORM:         { value: 1, label: '폭풍',     emoji: '🌪️', color: '#D63031', bgColor: 'rgba(214, 48, 49, 0.15)' },
};

export const WEATHER_TYPES = Object.keys(WEATHER_CONFIG) as WeatherType[];

export const PRESET_TAGS = [
  '회의후', '피곤', 'RSD', '약물복용후', '수면부족',
  '운동후', '업무중', '과집중', '불안', '감사',
];

export const MAX_DAILY_RECORDS = 5;
