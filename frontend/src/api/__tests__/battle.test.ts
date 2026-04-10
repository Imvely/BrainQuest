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
    it('calls POST /battle/start and returns StartBattleResponse', async () => {
      const request = { plannedMin: 25, questId: 1 };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            sessionId: 1,
            monster: { type: '오크', maxHp: 600 },
            plannedMin: 25,
          },
        },
      });

      const result = await startBattle(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/battle/start', request);
      expect(result.data.sessionId).toBe(1);
      expect(result.data.monster.type).toBe('오크');
      expect(result.data.monster.maxHp).toBe(600);
    });
  });

  describe('recordExit', () => {
    it('calls POST /battle/:id/exit and returns ExitResponse (exitId only)', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { exitId: 42 } },
      });
      const result = await recordExit(5);
      expect(mockApiClient.post).toHaveBeenCalledWith('/battle/5/exit');
      expect(result.data.exitId).toBe(42);
    });
  });

  describe('recordReturn', () => {
    it('calls POST /battle/:id/return and returns ReturnResponse', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            penaltyType: 'HP_RECOVER',
            durationSec: 45,
            monsterRemainingHp: 660,
            remainingTimeSec: 1200,
          },
        },
      });
      const result = await recordReturn(5);
      expect(mockApiClient.post).toHaveBeenCalledWith('/battle/5/return');
      expect(result.data.penaltyType).toBe('HP_RECOVER');
      // 필드명 주의: remainingTimeSec (not remainingSeconds)
      expect(result.data.remainingTimeSec).toBe(1200);
    });
  });

  describe('endBattle', () => {
    it('calls POST /battle/:id/end and returns EndBattleResponse', async () => {
      const request = { result: 'VICTORY' as const, maxCombo: 3 };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            result: 'VICTORY',
            actualMin: 25,
            expEarned: 50,
            goldEarned: 25,
            maxCombo: 3,
            exitCount: 0,
            perfectFocus: true,
            // 백엔드: levelUp은 Integer (새 레벨) 또는 null
            levelUp: null,
            // 백엔드: itemDrop (단수 UserItemResponse) 또는 null
            itemDrop: null,
          },
        },
      });

      const result = await endBattle(5, request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/battle/5/end', request);
      expect(result.data.expEarned).toBe(50);
      expect(result.data.perfectFocus).toBe(true);
      expect(result.data.levelUp).toBeNull();
      expect(result.data.itemDrop).toBeNull();
    });
  });

  describe('getBattleHistory', () => {
    it('calls GET /battle/history with from/to date range (not pagination)', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [] },
      });

      await getBattleHistory('2026-04-01', '2026-04-07');
      expect(mockApiClient.get).toHaveBeenCalledWith('/battle/history', {
        params: { from: '2026-04-01', to: '2026-04-07' },
      });
    });
  });
});
