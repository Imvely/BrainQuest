import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  setTokens,
  clearTokens,
  getHasCharacter,
  setHasCharacter,
  storage,
} from '../storage';

describe('storage utils', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  describe('access token', () => {
    it('returns undefined when no token is stored', () => {
      expect(getAccessToken()).toBeUndefined();
    });

    it('stores and retrieves access token', () => {
      setAccessToken('test-access-token');
      expect(getAccessToken()).toBe('test-access-token');
    });
  });

  describe('refresh token', () => {
    it('returns undefined when no token is stored', () => {
      expect(getRefreshToken()).toBeUndefined();
    });

    it('stores and retrieves refresh token', () => {
      setRefreshToken('test-refresh-token');
      expect(getRefreshToken()).toBe('test-refresh-token');
    });
  });

  describe('setTokens', () => {
    it('stores both tokens at once', () => {
      setTokens('access-123', 'refresh-456');
      expect(getAccessToken()).toBe('access-123');
      expect(getRefreshToken()).toBe('refresh-456');
    });
  });

  describe('clearTokens', () => {
    it('removes both tokens', () => {
      setTokens('access', 'refresh');
      clearTokens();
      expect(getAccessToken()).toBeUndefined();
      expect(getRefreshToken()).toBeUndefined();
    });
  });

  describe('hasCharacter', () => {
    it('defaults to false', () => {
      expect(getHasCharacter()).toBe(false);
    });

    it('stores and retrieves character flag', () => {
      setHasCharacter(true);
      expect(getHasCharacter()).toBe(true);
    });

    it('can be set back to false', () => {
      setHasCharacter(true);
      setHasCharacter(false);
      expect(getHasCharacter()).toBe(false);
    });
  });
});
