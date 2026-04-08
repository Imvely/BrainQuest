import { formatNumber, formatExp, formatPercent, formatGold } from '../format';

describe('format utils', () => {
  describe('formatNumber', () => {
    it('formats small numbers as-is', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(999)).toBe('999');
    });

    it('adds thousand separators', () => {
      expect(formatNumber(1000)).toContain('1');
      expect(formatNumber(1234567)).toBeDefined();
    });

    it('handles negative numbers', () => {
      const result = formatNumber(-500);
      expect(result).toContain('500');
    });
  });

  describe('formatExp', () => {
    it('formats current/total exp', () => {
      const result = formatExp(50, 100);
      expect(result).toContain('50');
      expect(result).toContain('100');
      expect(result).toContain('/');
    });

    it('formats large exp values', () => {
      const result = formatExp(1500, 5000);
      expect(result).toContain('/');
    });
  });

  describe('formatPercent', () => {
    it('rounds to integer', () => {
      expect(formatPercent(85.7)).toBe('86%');
      expect(formatPercent(0)).toBe('0%');
      expect(formatPercent(100)).toBe('100%');
    });

    it('handles decimal percentages', () => {
      expect(formatPercent(33.3)).toBe('33%');
      expect(formatPercent(66.6)).toBe('67%');
    });
  });

  describe('formatGold', () => {
    it('formats small gold values normally', () => {
      expect(formatGold(500)).toContain('500');
      expect(formatGold(500)).toContain('G');
    });

    it('abbreviates values >= 10000 with 만', () => {
      expect(formatGold(10000)).toContain('만');
      expect(formatGold(10000)).toContain('G');
      expect(formatGold(25000)).toContain('2.5');
    });

    it('handles zero gold', () => {
      expect(formatGold(0)).toContain('0');
      expect(formatGold(0)).toContain('G');
    });
  });
});
