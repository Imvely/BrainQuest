import apiClient from '../client';
import { login, refreshToken, getMe } from '../auth';

jest.mock('../client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('auth API', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('calls POST /auth/login with provider and token', async () => {
      const request = { provider: 'KAKAO' as const, token: 'kakao_token_123' };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: { accessToken: 'jwt_a', refreshToken: 'jwt_r', user: { id: 1 } },
        },
      });

      const result = await login(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', request);
      expect(result.data.accessToken).toBe('jwt_a');
    });

    it('handles login failure', async () => {
      (mockApiClient.post as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      await expect(login({ provider: 'GOOGLE' as const, token: 'bad' })).rejects.toThrow('Unauthorized');
    });
  });

  describe('refreshToken', () => {
    it('calls POST /auth/refresh with refresh token', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: { success: true, data: { accessToken: 'new_jwt', refreshToken: 'new_rt' } },
      });

      const result = await refreshToken('old_rt');
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'old_rt' });
      expect(result.data.accessToken).toBe('new_jwt');
    });

    it('handles expired refresh token', async () => {
      (mockApiClient.post as jest.Mock).mockRejectedValue(new Error('Token expired'));

      await expect(refreshToken('expired_rt')).rejects.toThrow('Token expired');
    });
  });

  describe('getMe', () => {
    it('calls GET /auth/me', async () => {
      (mockApiClient.get as jest.Mock).mockResolvedValue({
        data: { success: true, data: { id: 1, email: 'test@test.com', nickname: 'User' } },
      });

      const result = await getMe();
      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(result.data.email).toBe('test@test.com');
    });
  });
});
