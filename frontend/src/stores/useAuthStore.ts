import { create } from 'zustand';
import { User } from '../types/user';
import {
  getAccessToken,
  clearTokens,
  getHasCharacter,
  setHasCharacter as persistHasCharacter,
  getIsNewUser,
  setIsNewUser as persistIsNewUser,
} from '../utils/storage';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  hasCharacter: boolean;
  isNewUser: boolean;
  isLoading: boolean;

  setUser: (user: User) => void;
  setHasCharacter: (value: boolean) => void;
  setIsNewUser: (value: boolean) => void;
  checkAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  hasCharacter: false,
  isNewUser: true,
  isLoading: true,

  setUser: (user) => set({ user, isLoggedIn: true, isLoading: false }),

  setHasCharacter: (value) => {
    persistHasCharacter(value);
    set({ hasCharacter: value });
  },

  setIsNewUser: (value) => {
    persistIsNewUser(value);
    set({ isNewUser: value });
  },

  checkAuth: () => {
    const token = getAccessToken();
    const hasChar = getHasCharacter();
    const isNew = getIsNewUser();
    set({
      isLoggedIn: !!token,
      hasCharacter: hasChar,
      isNewUser: isNew,
      isLoading: false,
    });
  },

  logout: () => {
    clearTokens();
    set({ user: null, isLoggedIn: false, hasCharacter: false, isNewUser: true });
  },
}));
