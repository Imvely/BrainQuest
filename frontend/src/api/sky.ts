import apiClient from './client';
import { ApiResponse } from '../types/api';
import { EmotionRecord, EmotionRecordRequest, EmotionCalendarDay, WeeklySummary } from '../types/emotion';

export async function createEmotionRecord(request: EmotionRecordRequest): Promise<ApiResponse<EmotionRecord>> {
  const { data } = await apiClient.post('/sky/emotions', request);
  return data;
}

export async function getEmotionCalendar(yearMonth: string): Promise<ApiResponse<EmotionCalendarDay[]>> {
  const { data } = await apiClient.get(`/sky/calendar/${yearMonth}`);
  return data;
}

export async function getWeeklySummary(): Promise<ApiResponse<WeeklySummary>> {
  const { data } = await apiClient.get('/sky/summary/weekly');
  return data;
}
