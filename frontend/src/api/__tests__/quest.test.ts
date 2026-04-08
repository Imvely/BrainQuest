import apiClient from '../client';
import { generateQuest, getQuests, getQuestDetail, completeCheckpoint } from '../quest';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
    put: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('quest API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('generateQuest', () => {
    it('calls POST /quest/generate', async () => {
      const request = { originalTitle: '보고서 작성', category: 'WORK' as const };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { questTitle: '지식의 두루마리', grade: 'C' } },
      });

      const result = await generateQuest(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/quest/generate', request);
      expect(result.data.grade).toBe('C');
    });
  });

  describe('getQuests', () => {
    it('calls GET /quest with query params', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { content: [], totalElements: 0 } },
      });

      await getQuests({ status: 'ACTIVE', category: 'WORK' });
      expect(mockApiClient.get).toHaveBeenCalledWith('/quest', {
        params: { status: 'ACTIVE', category: 'WORK' },
      });
    });
  });

  describe('getQuestDetail', () => {
    it('calls GET /quest/:id', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 5, questTitle: '퀘스트' } },
      });

      const result = await getQuestDetail(5);
      expect(mockApiClient.get).toHaveBeenCalledWith('/quest/5');
      expect(result.data.id).toBe(5);
    });
  });

  describe('completeCheckpoint', () => {
    it('calls PUT /quest/:questId/checkpoints/:cpId/complete', async () => {
      (mockApiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      await completeCheckpoint(10, 3);
      expect(mockApiClient.put).toHaveBeenCalledWith('/quest/10/checkpoints/3/complete');
    });
  });
});
