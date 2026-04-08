import { create } from 'zustand';
import { Character } from '../types/character';

interface CharacterState {
  character: Character | null;
  setCharacter: (character: Character) => void;
  addExp: (exp: number) => void;
  addGold: (gold: number) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  character: null,

  setCharacter: (character) => set({ character }),

  addExp: (exp) =>
    set((state) => {
      if (!state.character) return {};
      return { character: { ...state.character, exp: state.character.exp + exp } };
    }),

  addGold: (gold) =>
    set((state) => {
      if (!state.character) return {};
      return { character: { ...state.character, gold: state.character.gold + gold } };
    }),
}));
