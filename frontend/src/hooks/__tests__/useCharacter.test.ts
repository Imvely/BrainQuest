import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCharacter, useCreateCharacter, useInventory, useEquipItem } from '../useCharacter';
import * as characterApi from '../../api/character';

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------

jest.mock('../../api/character');
const mockApi = characterApi as jest.Mocked<typeof characterApi>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: qc }, children);
  };
}

const CHARACTER_FIXTURE = {
  id: 1,
  userId: 1,
  name: '용감한 모험가',
  classType: 'WARRIOR' as const,
  level: 5,
  exp: 120,
  expToNext: 559,
  statAtk: 15,
  statWis: 12,
  statDef: 10,
  statAgi: 11,
  statHp: 130,
  gold: 350,
  appearance: { hair: 'style1', outfit: 'outfit1', color: '#FF0000' },
  equippedItems: { helmet: null, armor: null, weapon: 1, accessory: null },
};

const ITEM_FIXTURE = {
  id: 1,
  name: '나무 검',
  description: '초보 모험가의 기본 무기',
  slot: 'WEAPON' as const,
  rarity: 'COMMON' as const,
  statBonus: { atk: 3, def: 0, wis: 0, agi: 0, hp: 0 },
  imageUrl: 'https://example.com/sword.png',
};

const USER_ITEM_FIXTURE = {
  id: 1,
  userId: 1,
  item: ITEM_FIXTURE,
  acquiredAt: '2026-04-01T12:00:00Z',
  source: 'BATTLE_DROP' as const,
};

// ---------------------------------------------------------------------------
// Tests — useCharacter
// ---------------------------------------------------------------------------

describe('useCharacter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches character data and applies select to extract data field', async () => {
    mockApi.getCharacter.mockResolvedValueOnce({
      success: true,
      data: CHARACTER_FIXTURE,
      message: '',
    });

    const { result } = renderHook(() => useCharacter(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('용감한 모험가');
    expect(result.current.data?.classType).toBe('WARRIOR');
    expect(result.current.data?.level).toBe(5);
    expect(mockApi.getCharacter).toHaveBeenCalledTimes(1);
  });

  it('returns full character stats after select', async () => {
    mockApi.getCharacter.mockResolvedValueOnce({
      success: true,
      data: CHARACTER_FIXTURE,
      message: '',
    });

    const { result } = renderHook(() => useCharacter(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(CHARACTER_FIXTURE);
  });

  it('propagates API error', async () => {
    mockApi.getCharacter.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCharacter(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — useCreateCharacter
// ---------------------------------------------------------------------------

describe('useCreateCharacter', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls createCharacter API with correct parameters', async () => {
    mockApi.createCharacter.mockResolvedValueOnce({
      success: true,
      data: CHARACTER_FIXTURE,
      message: '',
    });

    const { result } = renderHook(() => useCreateCharacter(), { wrapper: createWrapper() });

    const request = {
      name: '용감한 모험가',
      classType: 'WARRIOR' as const,
      appearance: { hair: 'style1', outfit: 'outfit1', color: '#FF0000' },
    };

    await act(async () => {
      result.current.mutate(request);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.createCharacter).toHaveBeenCalledWith(request);
  });

  it('invalidates character query cache on success', async () => {
    mockApi.createCharacter.mockResolvedValueOnce({
      success: true,
      data: CHARACTER_FIXTURE,
      message: '',
    });

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useCreateCharacter(), { wrapper });

    await act(async () => {
      result.current.mutate({
        name: '용감한 모험가',
        classType: 'WARRIOR' as const,
        appearance: { hair: 'style1', outfit: 'outfit1', color: '#FF0000' },
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['character'] });
  });

  it('propagates creation failure', async () => {
    mockApi.createCharacter.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useCreateCharacter(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({
        name: '마법사',
        classType: 'MAGE' as const,
        appearance: { hair: 'style2', outfit: 'outfit2', color: '#0000FF' },
      });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// Tests — useInventory
// ---------------------------------------------------------------------------

describe('useInventory', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches inventory and applies select to extract data field', async () => {
    mockApi.getInventory.mockResolvedValueOnce({
      success: true,
      data: [USER_ITEM_FIXTURE],
      message: '',
    });

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].item.name).toBe('나무 검');
    expect(result.current.data![0].source).toBe('BATTLE_DROP');
    expect(mockApi.getInventory).toHaveBeenCalledTimes(1);
  });

  it('returns empty array when inventory is empty', async () => {
    mockApi.getInventory.mockResolvedValueOnce({
      success: true,
      data: [],
      message: '',
    });

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('propagates API error', async () => {
    mockApi.getInventory.mockRejectedValueOnce(new Error('Unauthorized'));

    const { result } = renderHook(() => useInventory(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Tests — useEquipItem
// ---------------------------------------------------------------------------

describe('useEquipItem', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls equipItem API with slot and itemId', async () => {
    const updatedCharacter = { ...CHARACTER_FIXTURE, equippedItems: { ...CHARACTER_FIXTURE.equippedItems, helmet: 2 } };
    mockApi.equipItem.mockResolvedValueOnce({
      success: true,
      data: updatedCharacter,
      message: '',
    });

    const { result } = renderHook(() => useEquipItem(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ slot: 'HELMET', itemId: 2 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.equipItem).toHaveBeenCalledWith('HELMET', 2);
  });

  it('invalidates character query cache on success', async () => {
    mockApi.equipItem.mockResolvedValueOnce({
      success: true,
      data: CHARACTER_FIXTURE,
      message: '',
    });

    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const spy = jest.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useEquipItem(), { wrapper });

    await act(async () => {
      result.current.mutate({ slot: 'WEAPON', itemId: 1 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['character'] });
  });

  it('supports unequipping by passing null itemId', async () => {
    const unequipped = { ...CHARACTER_FIXTURE, equippedItems: { helmet: null, armor: null, weapon: null, accessory: null } };
    mockApi.equipItem.mockResolvedValueOnce({
      success: true,
      data: unequipped,
      message: '',
    });

    const { result } = renderHook(() => useEquipItem(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ slot: 'WEAPON', itemId: null });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.equipItem).toHaveBeenCalledWith('WEAPON', null);
  });

  it('propagates equip failure', async () => {
    mockApi.equipItem.mockRejectedValueOnce(new Error('Item not found'));

    const { result } = renderHook(() => useEquipItem(), { wrapper: createWrapper() });

    await act(async () => {
      result.current.mutate({ slot: 'ARMOR', itemId: 999 });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
