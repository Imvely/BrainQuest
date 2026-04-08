import apiClient from '../client';
import { submitScreening, submitCheckin, getStreaks } from '../gate';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('gate API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('submitScreening', () => {
    it('calls POST /gate/screening with correct payload', async () => {
      const request = {
        testType: 'ASRS_6' as const,
        answers: { q1: 3, q2: 4, q3: 2, q4: 5, q5: 3, q6: 4 },
      };
      const mockResponse = {
        data: { success: true, data: { id: 1, totalScore: 21, riskLevel: 'HIGH' }, message: 'ok' },
      };
      (mockApiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await submitScreening(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/gate/screening', request);
      expect(result.data.riskLevel).toBe('HIGH');
    });
  });

  describe('submitCheckin', () => {
    it('calls POST /gate/checkin', async () => {
      const request = {
        checkinType: 'MORNING' as const,
        checkinDate: '2026-04-08',
        sleepHours: 7.5,
        sleepQuality: 2,
        condition: 4,
      };
      (mockApiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });

      await submitCheckin(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/gate/checkin', request);
    });
  });

  describe('getStreaks', () => {
    it('calls GET /gate/streaks', async () => {
      const mockStreaks = [
        { streakType: 'CHECKIN', currentCount: 7, maxCount: 14 },
        { streakType: 'BATTLE', currentCount: 3, maxCount: 10 },
      ];
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: mockStreaks },
      });

      const result = await getStreaks();
      expect(mockApiClient.get).toHaveBeenCalledWith('/gate/streaks');
      expect(result.data).toHaveLength(2);
    });
  });
});
