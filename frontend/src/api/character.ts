import apiClient from './client';
import { ApiResponse } from '../types/api';
import { Character, UserItem, ClassType, CharacterAppearance } from '../types/character';

export async function getCharacter(): Promise<ApiResponse<Character>> {
  const { data } = await apiClient.get('/character');
  return data;
}

export async function createCharacter(request: {
  name: string;
  classType: ClassType;
  appearance: CharacterAppearance;
}): Promise<ApiResponse<Character>> {
  const { data } = await apiClient.post('/character', request);
  return data;
}

export async function equipItem(slot: string, itemId: number | null): Promise<ApiResponse<Character>> {
  const { data } = await apiClient.put('/character/equip', { slot, itemId });
  return data;
}

export async function getInventory(): Promise<ApiResponse<UserItem[]>> {
  const { data } = await apiClient.get('/character/items');
  return data;
}
