import apiClient from './client';
import { ApiResponse } from '../types/api';

// --- Screening ---

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

export async function submitScreening(request: ScreeningRequest): Promise<ApiResponse<ScreeningResult>> {
  const { data } = await apiClient.post('/gate/screening', request);
  return data;
}

// --- Checkin ---

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

export interface CheckinResponse {
  id: number;
  streakCount: number;
  reward: { exp: number; gold: number };
}

export async function submitCheckin(request: CheckinRequest): Promise<ApiResponse<CheckinResponse>> {
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

export interface Streak {
  streakType: string;
  currentCount: number;
  maxCount: number;
  lastDate?: string;
}

export async function getStreaks(): Promise<ApiResponse<Streak[]>> {
  const { data } = await apiClient.get('/gate/streaks');
  return data;
}

// --- Medications ---

export interface Medication {
  id: number;
  medName: string;
  dosage: string;
  scheduleTime: string;
  isActive: boolean;
  createdAt: string;
}

export interface MedicationRequest {
  medName: string;
  dosage: string;
  scheduleTime: string;
}

export async function createMedication(request: MedicationRequest): Promise<ApiResponse<Medication>> {
  const { data } = await apiClient.post('/gate/medications', request);
  return data;
}

export async function getMedications(): Promise<ApiResponse<Medication[]>> {
  const { data } = await apiClient.get('/gate/medications');
  return data;
}

export interface MedLogRequest {
  medicationId: number;
  effectiveness?: number;
}

export interface MedLog {
  id: number;
  medicationId: number;
  logDate: string;
  takenAt: string;
  effectiveness?: number;
}

export async function createMedLog(request: MedLogRequest): Promise<ApiResponse<MedLog>> {
  const { data } = await apiClient.post('/gate/med-logs', request);
  return data;
}

export interface MedLogUpdateRequest {
  effectiveness?: number;
  sideEffects?: string[];
}

export async function updateMedLog(id: number, request: MedLogUpdateRequest): Promise<ApiResponse<MedLog>> {
  const { data } = await apiClient.put(`/gate/med-logs/${id}`, request);
  return data;
}

export async function getTodayCheckins(date: string): Promise<ApiResponse<CheckinRecord[]>> {
  const { data } = await apiClient.get('/gate/checkin/history', { params: { from: date, to: date } });
  return data;
}

export async function updateMedication(id: number, request: Partial<MedicationRequest> & { isActive?: boolean }): Promise<ApiResponse<Medication>> {
  const { data } = await apiClient.put(`/gate/medications/${id}`, request);
  return data;
}

export async function deleteMedication(id: number): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete(`/gate/medications/${id}`);
  return data;
}

export interface DailySummary {
  battleCount: number;
  battleWins: number;
  questCompleted: number;
  questTotal: number;
  dominantWeather: string | null;
  achievementRate: number;
}
