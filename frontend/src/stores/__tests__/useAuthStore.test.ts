import { useAuthStore } from '../useAuthStore';
import { storage } from '../../utils/storage';
import { User } from '../../types/user';

const mockUser: User = {
  id: 1,
  email: 'test@test.com',
  nickname: '테스터',
  provider: 'KAKAO',
  adhdStatus: 'UNKNOWN',
  timezone: 'Asia/Seoul',
  wakeTime: '07:00',
  sleepTime: '23:00',
  createdAt: '2026-01-01T00:00:00',
  updatedAt: '2026-01-01T00:00:00',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    storage.clearAll();
    useAuthStore.setState({
      user: null,
      isLoggedIn: false,
      hasCharacter: false,
      isNewUser: true,
      isLoading: true,
    });
  });

  it('has correct initial state', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(state.hasCharacter).toBe(false);
    expect(state.isNewUser).toBe(true);
    expect(state.isLoading).toBe(true);
  });

  describe('setUser', () => {
    it('sets user and marks as logged in', () => {
      useAuthStore.getState().setUser(mockUser);
      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isLoggedIn).toBe(true);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setHasCharacter', () => {
    it('updates hasCharacter state and persists to storage', () => {
      useAuthStore.getState().setHasCharacter(true);
      expect(useAuthStore.getState().hasCharacter).toBe(true);
      expect(storage.getBoolean('hasCharacter')).toBe(true);
    });
  });

  describe('setIsNewUser', () => {
    it('updates isNewUser state and persists to storage', () => {
      useAuthStore.getState().setIsNewUser(false);
      expect(useAuthStore.getState().isNewUser).toBe(false);
      expect(storage.getBoolean('isNewUser')).toBe(false);
    });

    it('defaults to true', () => {
      expect(useAuthStore.getState().isNewUser).toBe(true);
    });
  });

  describe('checkAuth', () => {
    it('sets isLoggedIn=false when no token exists', () => {
      useAuthStore.getState().checkAuth();
      const state = useAuthStore.getState();
      expect(state.isLoggedIn).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('sets isLoggedIn=true when token exists', () => {
      storage.set('accessToken', 'some-token');
      useAuthStore.getState().checkAuth();
      expect(useAuthStore.getState().isLoggedIn).toBe(true);
    });

    it('reads hasCharacter from storage', () => {
      storage.set('accessToken', 'token');
      storage.set('hasCharacter', true);
      useAuthStore.getState().checkAuth();
      expect(useAuthStore.getState().hasCharacter).toBe(true);
    });

    it('reads isNewUser from storage', () => {
      storage.set('accessToken', 'token');
      storage.set('isNewUser', false);
      useAuthStore.getState().checkAuth();
      expect(useAuthStore.getState().isNewUser).toBe(false);
    });
  });

  describe('logout', () => {
    it('clears user state and tokens', () => {
      storage.set('accessToken', 'token');
      storage.set('refreshToken', 'refresh');
      useAuthStore.getState().setUser(mockUser);

      useAuthStore.getState().logout();
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isLoggedIn).toBe(false);
      expect(state.hasCharacter).toBe(false);
      expect(state.isNewUser).toBe(true);
      expect(storage.getString('accessToken')).toBeUndefined();
      expect(storage.getString('refreshToken')).toBeUndefined();
    });
  });
});
