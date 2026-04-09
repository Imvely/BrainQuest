import { formatNumber, formatExp, formatPercent, formatGold } from '../format';

describe('formatNumber', () => {
  it('formats integer with locale separators', () => {
    const result = formatNumber(1234);
    // Korean locale uses comma separators
    expect(result).toContain('1');
    expect(result).toContain('234');
  });

  it('formats zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});

describe('formatExp', () => {
  it('formats current / total exp', () => {
    const result = formatExp(50, 100);
    expect(result).toContain('50');
    expect(result).toContain('/');
    expect(result).toContain('100');
  });
});

describe('formatPercent', () => {
  it('rounds and appends percent sign', () => {
    expect(formatPercent(85.7)).toBe('86%');
  });

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0%');
  });

  it('handles 100', () => {
    expect(formatPercent(100)).toBe('100%');
  });
});

describe('formatGold', () => {
  it('formats small gold amounts with G suffix', () => {
    const result = formatGold(500);
    expect(result).toContain('500');
    expect(result).toContain('G');
  });

  it('formats gold >= 10000 with 만 unit', () => {
    const result = formatGold(15000);
    expect(result).toBe('1.5만 G');
  });

  it('formats exactly 10000', () => {
    const result = formatGold(10000);
    expect(result).toBe('1.0만 G');
  });

  it('formats gold below 10000 without 만 unit', () => {
    const result = formatGold(9999);
    expect(result).toContain('G');
    expect(result).not.toContain('만');
  });
});
