import { WeatherType } from '../constants/weather';

/**
 * 감정 기록 — 백엔드 {@code EmotionResponse}.
 */
export interface EmotionRecord {
  id: number;
  weatherType: WeatherType;
  intensity: number;
  tags?: string[];
  memo?: string;
  recordedAt: string;
  // 백엔드 미포함 (레거시)
  userId?: number;
  voiceUrl?: string;
  voiceTranscript?: string;
  createdAt?: string;
}

/**
 * 감정 기록 요청 — 백엔드 {@code RecordEmotionRequest}.
 * <p>{@code voiceUrl}, {@code voiceTranscript}는 백엔드 DTO에 없다 (무시됨).</p>
 */
export interface EmotionRecordRequest {
  weatherType: WeatherType;
  intensity: number;
  tags?: string[];
  memo?: string;
  /** ISO LocalDateTime. 미지정 시 서버가 현재 시각 사용 */
  recordedAt?: string;
  // 아래는 백엔드 미지원 (제거 권장, 타입만 optional로 유지)
  voiceUrl?: string;
  voiceTranscript?: string;
}

/**
 * 월간 캘린더 응답 — 백엔드 {@code MonthlyCalendarResponse}.
 */
export interface MonthlyCalendarResponse {
  yearMonth: string;
  days: DayEmotionSummary[];
}

/**
 * 일별 감정 요약 — 백엔드 {@code DayEmotionSummary}.
 */
export interface DayEmotionSummary {
  date: string;
  dominantWeather: WeatherType;
  recordCount: number;
  records: EmotionRecord[];
}

/**
 * 하위 호환 타입 (일부 컴포넌트에서 사용) — {@code DayEmotionSummary}로 대체됨.
 * @deprecated Use {@link DayEmotionSummary}
 */
export interface EmotionCalendarDay {
  date: string;
  weatherType: WeatherType;
  avgIntensity: number;
  count: number;
}

/**
 * 주간 감정 요약 — 백엔드 {@code WeeklySummaryResponse}.
 * <p>필드명 주의:</p>
 * <ul>
 *   <li>{@code distribution} (not {@code weatherDistribution})</li>
 *   <li>{@code avgWeatherValue} (not {@code avgIntensity})</li>
 *   <li>{@code dominantWeather}, {@code topTags}는 백엔드에 없다</li>
 * </ul>
 */
export interface WeeklySummary {
  weekStart: string;
  weekEnd: string;
  distribution: Record<WeatherType, number>;
  comparedToLastWeek: Record<WeatherType, number>;
  totalRecords: number;
  /** 백엔드 WeatherType.numericValue의 평균 (1~7 범위) */
  avgWeatherValue: number;
}
