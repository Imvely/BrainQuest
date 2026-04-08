import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as characterApi from '../api/character';
import { ClassType, CharacterAppearance } from '../types/character';

export function useCharacter() {
  return useQuery({
    queryKey: ['character'],
    queryFn: () => characterApi.getCharacter(),
    select: (res) => res.data,
    staleTime: 60000,
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
