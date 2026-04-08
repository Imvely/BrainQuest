import apiClient from '../client';
import { createEmotionRecord, getEmotionCalendar, getWeeklySummary } from '../sky';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('sky API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createEmotionRecord', () => {
    it('calls POST /sky/emotions', async () => {
      const request = {
        weatherType: 'SUNNY' as const,
        intensity: 4,
        tags: ['좋은날'],
        recordedAt: '2026-04-08T10:00:00',
      };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, ...request } },
      });

      const result = await createEmotionRecord(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/sky/emotions', request);
      expect(result.data.weatherType).toBe('SUNNY');
    });
  });

  describe('getEmotionCalendar', () => {
    it('calls GET /sky/calendar/:yearMonth', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [] },
      });

      await getEmotionCalendar('2026-04');
      expect(mockApiClient.get).toHaveBeenCalledWith('/sky/calendar/2026-04');
    });
  });

  describe('getWeeklySummary', () => {
    it('calls GET /sky/summary/weekly', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { dominantWeather: 'CLOUDY' } },
      });

      const result = await getWeeklySummary();
      expect(mockApiClient.get).toHaveBeenCalledWith('/sky/summary/weekly');
      expect(result.data.dominantWeather).toBe('CLOUDY');
    });
  });
});
