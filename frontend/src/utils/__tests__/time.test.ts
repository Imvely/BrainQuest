import { minutesToHHMM, formatTime, formatDate } from '../time';

describe('time utils', () => {
  describe('minutesToHHMM', () => {
    it('returns minutes only when less than 60', () => {
      expect(minutesToHHMM(30)).toBe('30분');
      expect(minutesToHHMM(1)).toBe('1분');
    });

    it('returns hours only when exactly divisible', () => {
      expect(minutesToHHMM(60)).toBe('1시간');
      expect(minutesToHHMM(120)).toBe('2시간');
    });

    it('returns hours and minutes', () => {
      expect(minutesToHHMM(90)).toBe('1시간 30분');
      expect(minutesToHHMM(150)).toBe('2시간 30분');
    });

    it('handles zero', () => {
      expect(minutesToHHMM(0)).toBe('0분');
    });
  });

  describe('formatTime', () => {
    it('formats morning time with 오전', () => {
      expect(formatTime('07:00')).toBe('오전 7:00');
      expect(formatTime('09:30')).toBe('오전 9:30');
    });

    it('formats afternoon time with 오후', () => {
      expect(formatTime('13:00')).toBe('오후 1:00');
      expect(formatTime('23:00')).toBe('오후 11:00');
    });

    it('formats noon correctly', () => {
      expect(formatTime('12:00')).toBe('오후 12:00');
    });

    it('formats midnight correctly', () => {
      expect(formatTime('00:00')).toBe('오전 12:00');
    });
  });

  describe('formatDate', () => {
    it('formats date in Korean format', () => {
      const result = formatDate('2026-04-08');
      expect(result).toContain('4월');
      expect(result).toContain('8일');
    });
  });
});
