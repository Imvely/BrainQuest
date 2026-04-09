import {
  storage,
  setTokens,
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  getHasCharacter,
  setHasCharacter,
  getIsNewUser,
  setIsNewUser,
} from '../storage';

describe('storage utilities', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('setTokens stores both access and refresh tokens', () => {
    setTokens('access-123', 'refresh-456');
    expect(storage.getString('accessToken')).toBe('access-123');
    expect(storage.getString('refreshToken')).toBe('refresh-456');
  });

  it('getAccessToken returns stored token', () => {
    setAccessToken('my-access');
    expect(getAccessToken()).toBe('my-access');
  });

  it('getAccessToken returns undefined when no token', () => {
    expect(getAccessToken()).toBeUndefined();
  });

  it('getRefreshToken returns stored token', () => {
    setRefreshToken('my-refresh');
    expect(getRefreshToken()).toBe('my-refresh');
  });

  it('clearTokens removes access, refresh tokens and isNewUser', () => {
    setTokens('access', 'refresh');
    setIsNewUser(false);
    clearTokens();
    expect(getAccessToken()).toBeUndefined();
    expect(getRefreshToken()).toBeUndefined();
    expect(storage.getString('isNewUser')).toBeUndefined();
  });

  it('getHasCharacter returns false by default', () => {
    expect(getHasCharacter()).toBe(false);
  });

  it('setHasCharacter/getHasCharacter roundtrip', () => {
    setHasCharacter(true);
    expect(getHasCharacter()).toBe(true);
    setHasCharacter(false);
    expect(getHasCharacter()).toBe(false);
  });

  it('getIsNewUser returns true by default', () => {
    expect(getIsNewUser()).toBe(true);
  });

  it('setIsNewUser/getIsNewUser roundtrip', () => {
    setIsNewUser(false);
    expect(getIsNewUser()).toBe(false);
    setIsNewUser(true);
    expect(getIsNewUser()).toBe(true);
  });
});
