import { WeatherType } from '../constants/weather';

export interface EmotionRecord {
  id: number;
  userId: number;
  weatherType: WeatherType;
  intensity: number;
  tags?: string[];
  memo?: string;
  voiceUrl?: string;
  voiceTranscript?: string;
  recordedAt: string;
  createdAt: string;
}

export interface EmotionRecordRequest {
  weatherType: WeatherType;
  intensity: number;
  tags?: string[];
  memo?: string;
  voiceUrl?: string;
  voiceTranscript?: string;
  recordedAt: string;
}

export interface EmotionCalendarDay {
  date: string;
  weatherType: WeatherType;
  avgIntensity: number;
  count: number;
}

export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  dominantWeather: WeatherType;
  avgIntensity: number;
  totalRecords: number;
  weatherDistribution: Record<WeatherType, number>;
  comparedToLastWeek?: Record<WeatherType, number>;
  topTags: string[];
}
