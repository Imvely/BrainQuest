import { WEATHER_CONFIG, WEATHER_TYPES, WeatherType } from '../weather';

describe('weather constants', () => {
  it('defines 7 weather types', () => {
    expect(WEATHER_TYPES).toHaveLength(7);
  });

  it('values decrease from SUNNY(7) to STORM(1)', () => {
    expect(WEATHER_CONFIG.SUNNY.value).toBe(7);
    expect(WEATHER_CONFIG.STORM.value).toBe(1);
  });

  it('all weather types have required fields', () => {
    WEATHER_TYPES.forEach((type: WeatherType) => {
      const config = WEATHER_CONFIG[type];
      expect(config.value).toBeGreaterThanOrEqual(1);
      expect(config.value).toBeLessThanOrEqual(7);
      expect(config.label).toBeTruthy();
      expect(config.emoji).toBeTruthy();
      expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('each weather type has a unique value', () => {
    const values = WEATHER_TYPES.map((t) => WEATHER_CONFIG[t].value);
    expect(new Set(values).size).toBe(values.length);
  });
});
