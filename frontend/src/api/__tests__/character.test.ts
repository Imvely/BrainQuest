import apiClient from '../client';
import { getCharacter, createCharacter, equipItem, getInventory } from '../character';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('character API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getCharacter', () => {
    it('calls GET /character', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, name: '용사', level: 5 } },
      });

      const result = await getCharacter();
      expect(mockApiClient.get).toHaveBeenCalledWith('/character');
      expect(result.data.name).toBe('용사');
    });
  });

  describe('createCharacter', () => {
    it('calls POST /character with correct payload', async () => {
      const request = {
        name: '마법사',
        classType: 'MAGE' as const,
        appearance: { hair: 'style1', outfit: 'outfit1', color: '#FF0000' },
      };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, ...request } },
      });

      const result = await createCharacter(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/character', request);
      expect(result.data.name).toBe('마법사');
    });
  });

  describe('equipItem', () => {
    it('calls PUT /character/equip', async () => {
      (mockApiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, equippedItems: { weapon: 5 } } },
      });

      await equipItem('weapon', 5);
      expect(mockApiClient.put).toHaveBeenCalledWith('/character/equip', { slot: 'weapon', itemId: 5 });
    });

    it('handles unequip (null itemId)', async () => {
      (mockApiClient.put as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1 } },
      });

      await equipItem('weapon', null);
      expect(mockApiClient.put).toHaveBeenCalledWith('/character/equip', { slot: 'weapon', itemId: null });
    });
  });

  describe('getInventory', () => {
    it('calls GET /character/items', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [{ id: 1, name: '강철 검' }] },
      });

      const result = await getInventory();
      expect(mockApiClient.get).toHaveBeenCalledWith('/character/items');
      expect(result.data).toHaveLength(1);
    });

    it('returns empty array when no items', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: [] },
      });

      const result = await getInventory();
      expect(result.data).toHaveLength(0);
    });
  });
});
