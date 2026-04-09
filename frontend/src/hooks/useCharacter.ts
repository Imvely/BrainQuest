import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as characterApi from '../api/character';
import { ClassType, CharacterAppearance } from '../types/character';
import { STALE_TIME } from '../constants/query';

export function useCharacter() {
  return useQuery({
    queryKey: ['character'],
    queryFn: () => characterApi.getCharacter(),
    select: (res) => res.data,
    staleTime: STALE_TIME.NORMAL,
  });
}

export function useCreateCharacter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { name: string; classType: ClassType; appearance: CharacterAppearance }) =>
      characterApi.createCharacter(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });
}

export function useInventory() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: () => characterApi.getInventory(),
    select: (res) => res.data,
    staleTime: STALE_TIME.NORMAL,
  });
}

export function useEquipItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slot, itemId }: { slot: string; itemId: number | null }) =>
      characterApi.equipItem(slot, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['character'] });
    },
  });
}
