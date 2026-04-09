import apiClient from '../client';
import { startBattle, recordExit, recordReturn, endBattle, getBattleHistory } from '../battle';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('battle API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('startBattle', () => {
    it('calls POST /battle/start', async () => {
      const request = { plannedMin: 25, questId: 1 };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, monsterType: 'SLIME' } },
      });

      const result = await startBattle(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/battle/start', request);
      expect(result.data.monsterType).toBe('SLIME');
    });
  });

  describe('recordExit', () => {
    it('calls POST /battle/:id/exit', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });
      await recordExit(5);
      expect(mockApiClient.post).toHaveBeenCalledWith('/battle/5/exit');
    });
  });

  describe('recordReturn', () => {
    it('calls POST /battle/:id/return', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({ data: { success: true } });
      await recordReturn(5);
      expect(mockApiClient.post).toHaveBeenCalledWith('/battle/5/return');
    });
  });

  describe('endBattle', () => {
    it('calls POST /battle/:id/end with result and maxCombo', async () => {
      const request = { result: 'VICTORY' as const, maxCombo: 3 };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { expEarned: 50, goldEarned: 30, itemDrops: [], levelUp: false, checkpointCompleted: false } },
      });

      const result = await endBattle(5, request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/battle/5/end', request);
      expect(result.data.expEarned).toBe(50);
    });
  });

  describe('getBattleHistory', () => {
    it('calls GET /battle/history with pagination', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [] },
      });

      await getBattleHistory({ page: 0, size: 10 });
      expect(mockApiClient.get).toHaveBeenCalledWith('/battle/history', {
        params: { page: 0, size: 10 },
      });
    });
  });
});
