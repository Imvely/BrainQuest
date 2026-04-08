import apiClient from './client';
import { ApiResponse } from '../types/api';

export interface ScreeningRequest {
  testType: 'ASRS_6' | 'ASRS_18';
  answers: Record<string, number>;
}

export interface ScreeningResult {
  id: number;
  testType: string;
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}

export interface CheckinRequest {
  checkinType: 'MORNING' | 'EVENING';
  checkinDate: string;
  sleepHours?: number;
  sleepQuality?: number;
  condition?: number;
  focusScore?: number;
  impulsivityScore?: number;
  emotionScore?: number;
  memo?: string;
}

export interface Streak {
  streakType: string;
  currentCount: number;
  maxCount: number;
  lastDate?: string;
}

export async function submitScreening(request: ScreeningRequest): Promise<ApiResponse<ScreeningResult>> {
  const { data } = await apiClient.post('/gate/screening', request);
  return data;
}

export async function submitCheckin(request: CheckinRequest): Promise<ApiResponse<void>> {
  const { data } = await apiClient.post('/gate/checkin', request);
  return data;
}

export interface CheckinRecord {
  id: number;
  checkinType: 'MORNING' | 'EVENING';
  checkinDate: string;
  sleepHours?: number;
  sleepQuality?: number;
  condition?: number;
  focusScore?: number;
  impulsivityScore?: number;
  emotionScore?: number;
  memo?: string;
  createdAt: string;
}

export async function getCheckinHistory(params?: { page?: number; size?: number }): Promise<ApiResponse<CheckinRecord[]>> {
  const { data } = await apiClient.get('/gate/checkin/history', { params });
  return data;
}

export async function getStreaks(): Promise<ApiResponse<Streak[]>> {
  const { data } = await apiClient.get('/gate/streaks');
  return data;
}
