import apiClient from './client';
import { ApiResponse } from '../types/api';
import {
  EmotionRecord,
  EmotionRecordRequest,
  MonthlyCalendarResponse,
  WeeklySummary,
} from '../types/emotion';

/**
 * 감정 기록 생성 — 백엔드 {@code POST /api/v1/sky/emotions}.
 */
export async function createEmotionRecord(
  request: EmotionRecordRequest,
): Promise<ApiResponse<EmotionRecord>> {
  const { data } = await apiClient.post('/sky/emotions', request);
  return data;
}

/**
 * 월간 감정 캘린더 조회 — 백엔드 {@code GET /api/v1/sky/calendar/{yearMonth}}.
 * <p>응답은 {@code MonthlyCalendarResponse { yearMonth, days: DayEmotionSummary[] }} 객체.</p>
 *
 * @param yearMonth yyyy-MM 형식
 */
export async function getEmotionCalendar(
  yearMonth: string,
): Promise<ApiResponse<MonthlyCalendarResponse>> {
  const { data } = await apiClient.get(`/sky/calendar/${yearMonth}`);
  return data;
}

/**
 * 주간 감정 요약 조회 — 백엔드 {@code GET /api/v1/sky/summary/weekly}.
 */
export async function getWeeklySummary(): Promise<ApiResponse<WeeklySummary>> {
  const { data } = await apiClient.get('/sky/summary/weekly');
  return data;
}

/**
 * 특정 날짜의 감정 기록 조회 — 백엔드 {@code GET /api/v1/sky/emotions?date=yyyy-MM-dd}.
 */
export async function getEmotionsByDate(
  date: string,
): Promise<ApiResponse<EmotionRecord[]>> {
  const { data } = await apiClient.get('/sky/emotions', { params: { date } });
  return data;
}
