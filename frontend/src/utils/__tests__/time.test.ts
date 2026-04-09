import { parseHHMM, minutesToHHMM, formatTime } from '../time';

describe('parseHHMM', () => {
  it('parses "09:30" to 570 minutes', () => {
    expect(parseHHMM('09:30')).toBe(570);
  });

  it('parses "00:00" to 0', () => {
    expect(parseHHMM('00:00')).toBe(0);
  });

  it('parses "23:59" to 1439', () => {
    expect(parseHHMM('23:59')).toBe(1439);
  });

  it('parses "12:00" to 720', () => {
    expect(parseHHMM('12:00')).toBe(720);
  });

  it('handles hour-only string "14" gracefully', () => {
    // "14" splits to ["14"], m would be NaN but || 0 handles it
    expect(parseHHMM('14')).toBe(840);
  });
});

describe('minutesToHHMM', () => {
  it('formats minutes only when less than 60', () => {
    expect(minutesToHHMM(30)).toBe('30분');
  });

  it('formats hours only when exact hours', () => {
    expect(minutesToHHMM(120)).toBe('2시간');
  });

  it('formats hours and minutes', () => {
    expect(minutesToHHMM(90)).toBe('1시간 30분');
  });

  it('formats zero minutes', () => {
    expect(minutesToHHMM(0)).toBe('0분');
  });
});

describe('formatTime', () => {
  it('formats morning time with 오전', () => {
    expect(formatTime('09:30')).toBe('오전 9:30');
  });

  it('formats afternoon time with 오후', () => {
    expect(formatTime('14:30')).toBe('오후 2:30');
  });

  it('formats midnight as 오전 12:00', () => {
    expect(formatTime('00:00')).toBe('오전 12:00');
  });

  it('formats noon as 오후 12:00', () => {
    expect(formatTime('12:00')).toBe('오후 12:00');
  });

  it('pads minutes with leading zero', () => {
    expect(formatTime('08:05')).toBe('오전 8:05');
  });
});
