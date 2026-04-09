import { useAuthStore } from '../useAuthStore';
import { storage } from '../../utils/storage';
import { User } from '../../types/user';

const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  nickname: 'Tester',
  provider: 'KAKAO',
  adhdStatus: 'UNKNOWN',
  timezone: 'Asia/Seoul',
  wakeTime: '07:00',
  sleepTime: '23:00',
  createdAt: '2024-01-01T00:00:00',
  updatedAt: '2024-01-01T00:00:00',
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
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoading).toBe(true);
    expect(state.user).toBeNull();
    expect(state.hasCharacter).toBe(false);
    expect(state.isNewUser).toBe(true);
  });

  it('setUser sets user and isLoggedIn=true', () => {
    useAuthStore.getState().setUser(mockUser);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isLoggedIn).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it('setHasCharacter persists to storage and updates state', () => {
    useAuthStore.getState().setHasCharacter(true);
    const state = useAuthStore.getState();
    expect(state.hasCharacter).toBe(true);
    expect(storage.getBoolean('hasCharacter')).toBe(true);
  });

  it('setIsNewUser persists to storage and updates state', () => {
    useAuthStore.getState().setIsNewUser(false);
    const state = useAuthStore.getState();
    expect(state.isNewUser).toBe(false);
    expect(storage.getBoolean('isNewUser')).toBe(false);
  });

  it('checkAuth hydrates from storage when token exists', () => {
    storage.set('accessToken', 'test-token');
    storage.set('hasCharacter', true);
    storage.set('isNewUser', false);

    useAuthStore.getState().checkAuth();
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(true);
    expect(state.hasCharacter).toBe(true);
    expect(state.isNewUser).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('checkAuth sets isLoggedIn=false when no token', () => {
    useAuthStore.getState().checkAuth();
    const state = useAuthStore.getState();
    expect(state.isLoggedIn).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it('logout clears user, isLoggedIn, and hasCharacter', () => {
    // Set up logged-in state
    storage.set('accessToken', 'test-token');
    storage.set('refreshToken', 'test-refresh');
    useAuthStore.setState({
      user: mockUser,
      isLoggedIn: true,
      hasCharacter: true,
      isNewUser: false,
    });

    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
    expect(state.hasCharacter).toBe(false);
    expect(state.isNewUser).toBe(true);
    // Tokens should be cleared from storage
    expect(storage.getString('accessToken')).toBeUndefined();
    expect(storage.getString('refreshToken')).toBeUndefined();
  });
});
