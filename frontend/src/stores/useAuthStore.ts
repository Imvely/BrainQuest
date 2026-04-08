import { create } from 'zustand';
import { User } from '../types/user';
import { getAccessToken, clearTokens, getHasCharacter, setHasCharacter } from '../utils/storage';

interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  hasCharacter: boolean;
  isLoading: boolean;

  setUser: (user: User) => void;
  setHasCharacter: (value: boolean) => void;
  checkAuth: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoggedIn: false,
  hasCharacter: false,
  isLoading: true,

  setUser: (user) => set({ user, isLoggedIn: true, isLoading: false }),

  setHasCharacter: (value) => {
    setHasCharacter(value);
    set({ hasCharacter: value });
  },

  checkAuth: () => {
    const token = getAccessToken();
    const hasChar = getHasCharacter();
    set({
      isLoggedIn: !!token,
      hasCharacter: hasChar,
      isLoading: false,
    });
  },

  logout: () => {
    clearTokens();
    set({ user: null, isLoggedIn: false, hasCharacter: false });
  },
}));
