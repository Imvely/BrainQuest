import { format, differenceInMinutes, parse } from 'date-fns';
import { ko } from 'date-fns/locale';

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}분`;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export function remainingMinutes(endTime: string, now: Date = new Date()): number {
  const today = format(now, 'yyyy-MM-dd');
  const end = parse(`${today} ${endTime}`, 'yyyy-MM-dd HH:mm', now);
  return Math.max(0, differenceInMinutes(end, now));
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h < 12 ? '오전' : '오후';
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${period} ${hour12}:${String(m).padStart(2, '0')}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'M월 d일 (EEE)', { locale: ko });
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return format(date, 'M월 d일 a h:mm', { locale: ko });
}
