import apiClient from '../client';
import { login, refreshToken } from '../auth';

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
    it('calls POST /auth/login with provider and accessToken (backend LoginRequest shape)', async () => {
      const request = { provider: 'KAKAO' as const, accessToken: 'kakao_access_token_123' };
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            accessToken: 'jwt_a',
            refreshToken: 'jwt_r',
            userId: 1,
            nickname: '모험가',
            isNewUser: true,
          },
        },
      });

      const result = await login(request);
      expect(mockApiClient.post).toHaveBeenCalledWith('/auth/login', request);
      expect(result.data.accessToken).toBe('jwt_a');
      expect(result.data.userId).toBe(1);
    });

    it('handles login failure', async () => {
      (mockApiClient.post as jest.Mock).mockRejectedValue(new Error('Unauthorized'));

      await expect(
        login({ provider: 'GOOGLE' as const, accessToken: 'bad' }),
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('refreshToken', () => {
    it('calls POST /auth/refresh with refresh token', async () => {
      (mockApiClient.post as jest.Mock).mockResolvedValue({
        data: {
          success: true,
          data: {
            accessToken: 'new_jwt',
            refreshToken: 'new_rt',
            userId: 1,
            nickname: '모험가',
            isNewUser: false,
          },
        },
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

  // NOTE: `getMe()` 함수는 백엔드 미구현으로 제거됨. 기존 테스트도 삭제.
});
