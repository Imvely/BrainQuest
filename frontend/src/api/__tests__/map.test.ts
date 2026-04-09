import apiClient from '../client';
import {
  getTimeline,
  createTimeBlock,
  updateTimeBlock,
  deleteTimeBlock,
  createPrediction,
  updatePredictionActual,
} from '../map';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('map API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getTimeline', () => {
    it('calls GET /map/timeline/:date', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [] },
      });

      await getTimeline('2026-04-09');
      expect(mockApiClient.get).toHaveBeenCalledWith('/map/timeline/2026-04-09');
    });

    it('returns block data', async () => {
      const blocks = [{ id: 1, title: '업무', startTime: '09:00', endTime: '10:00' }];
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: blocks },
      });

      const result = await getTimeline('2026-04-09');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('업무');
    });
  });

  describe('createTimeBlock', () => {
    it('calls POST /map/blocks with request body', async () => {
      const request = {
        blockDate: '2026-04-09',
        startTime: '09:00',
        endTime: '10:00',
        category: 'WORK' as const,
        title: '보고서 작성',
      };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, ...request } },
      });

      const result = await createTimeBlock(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/map/blocks', request);
      expect(result.data.title).toBe('보고서 작성');
    });
  });

  describe('updateTimeBlock', () => {
    it('calls PUT /map/blocks/:id', async () => {
      const update = { title: '수정된 블록' };
      (mockApiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 5, title: '수정된 블록' } },
      });

      await updateTimeBlock(5, update);
      expect(mockApiClient.put).toHaveBeenCalledWith('/map/blocks/5', update);
    });
  });

  describe('deleteTimeBlock', () => {
    it('calls DELETE /map/blocks/:id', async () => {
      (mockApiClient.delete as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await deleteTimeBlock(3);
      expect(mockApiClient.delete).toHaveBeenCalledWith('/map/blocks/3');
    });
  });

  describe('createPrediction', () => {
    it('calls POST /map/predictions', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, predictedMin: 30 } },
      });

      await createPrediction(10, 30);
      expect(mockApiClient.post).toHaveBeenCalledWith('/map/predictions', {
        blockId: 10,
        predictedMin: 30,
      });
    });
  });

  describe('updatePredictionActual', () => {
    it('calls PUT /map/predictions/:id/actual', async () => {
      (mockApiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, actualMin: 35, accuracyPct: 85 } },
      });

      const result = await updatePredictionActual(1, 35);
      expect(mockApiClient.put).toHaveBeenCalledWith('/map/predictions/1/actual', { actualMin: 35 });
      expect(result.data.accuracyPct).toBe(85);
    });
  });
});
