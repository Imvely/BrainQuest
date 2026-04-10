import apiClient from './client';
import { ApiResponse } from '../types/api';

// ---------------------------------------------------------------------------
// Screening
// ---------------------------------------------------------------------------

export interface ScreeningRequest {
  testType: 'ASRS_6' | 'ASRS_18';
  answers: Record<string, number>;
}

export interface ScreeningResult {
  id: number;
  testType: string;
  answers?: Record<string, number>;
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
}

export async function submitScreening(
  request: ScreeningRequest,
): Promise<ApiResponse<ScreeningResult>> {
  const { data } = await apiClient.post('/gate/screening', request);
  return data;
}

// ---------------------------------------------------------------------------
// Checkin
// ---------------------------------------------------------------------------

/**
 * 체크인 요청.
 * <p>백엔드 {@code CheckinRequest} 필드명은 {@code type}(CheckinType)이며 {@code checkinType}이 아니다.
 * {@code checkinDate}는 서버가 {@code LocalDate.now()}로 결정하므로 요청에 포함하지 않는다.</p>
 */
export interface CheckinRequest {
  type: 'MORNING' | 'EVENING';
  sleepHours?: number;
  sleepQuality?: number;
  condition?: number;
  focusScore?: number;
  impulsivityScore?: number;
  emotionScore?: number;
  memo?: string;
}

/**
 * 체크인 응답 (백엔드 {@code CheckinResponse}와 동일).
 * <p>보상은 단일 {@code expReward: int} 필드로 반환되며, 골드는 이벤트 버스를 통해 별도 지급된다.</p>
 */
export interface CheckinResponse {
  id: number;
  type: 'MORNING' | 'EVENING';
  checkinDate: string;
  sleepHours?: number;
  sleepQuality?: number;
  condition?: number;
  focusScore?: number;
  impulsivityScore?: number;
  emotionScore?: number;
  memo?: string;
  streakCount: number;
  expReward: number;
}

export async function submitCheckin(
  request: CheckinRequest,
): Promise<ApiResponse<CheckinResponse>> {
  const { data } = await apiClient.post('/gate/checkin', request);
  return data;
}

// CheckinRecord는 CheckinResponse와 동일한 필드 구조 (히스토리 조회 시 동일 DTO 반환)
export type CheckinRecord = CheckinResponse;

/**
 * 체크인 히스토리 조회.
 * <p>백엔드는 {@code from}, {@code to} 날짜 범위 쿼리 파라미터를 필수로 요구한다.
 * 페이지네이션({@code page}, {@code size})은 지원하지 않는다.</p>
 *
 * @param from yyyy-MM-dd 형식
 * @param to   yyyy-MM-dd 형식
 */
export async function getCheckinHistory(
  from: string,
  to: string,
): Promise<ApiResponse<CheckinRecord[]>> {
  const { data } = await apiClient.get('/gate/checkin/history', {
    params: { from, to },
  });
  return data;
}

/**
 * 오늘 날짜 체크인 조회 헬퍼 — {@code from=to=date}로 위 엔드포인트 호출.
 */
export async function getTodayCheckins(
  date: string,
): Promise<ApiResponse<CheckinRecord[]>> {
  return getCheckinHistory(date, date);
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Medications — 백엔드 전체 CRUD 지원:
//   POST   /gate/medications         (create)
//   GET    /gate/medications         (list, 비활성 포함)
//   PUT    /gate/medications/{id}    (update, 부분 업데이트)
//   DELETE /gate/medications/{id}    (delete, 복용 기록 cascade 삭제)
//   POST   /gate/med-logs            (log 생성)
//   PUT    /gate/med-logs/{id}       (log 수정)
// ---------------------------------------------------------------------------

export interface Medication {
  id: number;
  medName: string;
  dosage: string;
  /** HH:mm 형식 */
  scheduleTime: string;
  /** 백엔드 {@code MedicationResponse}는 Lombok 기본 규약으로 {@code active} (not {@code isActive}) */
  active: boolean;
  createdAt?: string;
}

export interface MedicationRequest {
  medName: string;
  dosage: string;
  /** HH:mm 형식 (백엔드 LocalTime) */
  scheduleTime: string;
}

export async function createMedication(
  request: MedicationRequest,
): Promise<ApiResponse<Medication>> {
  const { data } = await apiClient.post('/gate/medications', request);
  return data;
}

/**
 * 사용자의 전체 약물 목록 조회 (비활성 포함, scheduleTime 오름차순).
 */
export async function getMedications(): Promise<ApiResponse<Medication[]>> {
  const { data } = await apiClient.get('/gate/medications');
  return data;
}

/**
 * 약물 정보 부분 업데이트. null이 아닌 필드만 반영된다.
 */
export async function updateMedication(
  id: number,
  request: Partial<MedicationRequest> & { active?: boolean },
): Promise<ApiResponse<Medication>> {
  const { data } = await apiClient.put(`/gate/medications/${id}`, request);
  return data;
}

/**
 * 약물 삭제.
 * <p><b>주의</b>: 백엔드는 {@code ON DELETE CASCADE}로 해당 약물의 복용 기록도 함께 삭제한다.
 * 기록 보존이 필요하면 {@link updateMedication}로 {@code active=false} 설정 권장.</p>
 */
export async function deleteMedication(id: number): Promise<ApiResponse<void>> {
  const { data } = await apiClient.delete(`/gate/medications/${id}`);
  return data;
}

// ---------------------------------------------------------------------------
// Medication logs
// ---------------------------------------------------------------------------

export interface MedLogRequest {
  medicationId: number;
  effectiveness?: number;
  sideEffects?: string[];
}

export interface MedLog {
  id: number;
  medicationId: number;
  logDate: string;
  takenAt: string;
  effectiveness?: number;
  sideEffects?: string[];
}

export async function createMedLog(
  request: MedLogRequest,
): Promise<ApiResponse<MedLog>> {
  const { data } = await apiClient.post('/gate/med-logs', request);
  return data;
}

export interface MedLogUpdateRequest {
  effectiveness?: number;
  sideEffects?: string[];
}

/**
 * 복용 기록의 약효/부작용 정보 부분 업데이트.
 * <p>복용 즉시에는 {@code effectiveness}가 null인 경우가 많아 나중에 평가할 때 사용.</p>
 */
export async function updateMedLog(
  id: number,
  request: MedLogUpdateRequest,
): Promise<ApiResponse<MedLog>> {
  const { data } = await apiClient.put(`/gate/med-logs/${id}`, request);
  return data;
}

// ---------------------------------------------------------------------------
// Daily summary (로컬 집계용 타입, 백엔드에 별도 엔드포인트는 없음)
// ---------------------------------------------------------------------------

export interface DailySummary {
  battleCount: number;
  battleWins: number;
  questCompleted: number;
  questTotal: number;
  dominantWeather: string | null;
  achievementRate: number;
}
