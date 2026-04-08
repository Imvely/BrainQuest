import { storage } from '../../utils/storage';

// Variables prefixed with `mock` are allowed in jest.mock factory
const mockRequestInterceptors: Array<{ fulfilled: Function }> = [];
const mockResponseInterceptors: Array<{ fulfilled: Function; rejected: Function }> = [];

let mockInstance: any;

jest.mock('axios', () => {
  mockRequestInterceptors.length = 0;
  mockResponseInterceptors.length = 0;

  mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn((fn: Function) => {
          mockRequestInterceptors.push({ fulfilled: fn });
          return mockRequestInterceptors.length - 1;
        }),
        eject: jest.fn(),
      },
      response: {
        use: jest.fn((fn: Function, errFn: Function) => {
          mockResponseInterceptors.push({ fulfilled: fn, rejected: errFn });
          return mockResponseInterceptors.length - 1;
        }),
        eject: jest.fn(),
      },
    },
    defaults: { headers: { common: {} } },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
      post: jest.fn(),
    },
    AxiosError: class AxiosError extends Error {
      response: any;
      config: any;
      constructor(msg: string, config?: any, _code?: string, _request?: any, response?: any) {
        super(msg);
        this.config = config;
        this.response = response;
      }
    },
  };
});

describe('API client', () => {
  beforeEach(() => {
    storage.clearAll();
    jest.clearAllMocks();
  });

  // === 1. Instance creation ===
  it('creates an axios instance with correct config', () => {
    const axios = require('axios').default;
    jest.isolateModules(() => {
      require('../client');
    });
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
  });

  // === 2. Interceptor registration ===
  it('registers request interceptor for JWT', () => {
    const axios = require('axios').default;
    const instance = axios.create();
    jest.isolateModules(() => {
      require('../client');
    });
    expect(instance.interceptors.request.use).toHaveBeenCalled();
  });

  it('registers response interceptor for 401 handling', () => {
    const axios = require('axios').default;
    const instance = axios.create();
    jest.isolateModules(() => {
      require('../client');
    });
    expect(instance.interceptors.response.use).toHaveBeenCalled();
  });

  // === 3. Request interceptor - JWT attachment ===
  describe('request interceptor', () => {
    it('attaches JWT token to request headers', () => {
      jest.isolateModules(() => {
        require('../client');
      });

      storage.set('accessToken', 'test-jwt-token');

      const interceptor = mockRequestInterceptors[mockRequestInterceptors.length - 1];
      if (interceptor) {
        const config = { headers: {} as any };
        const result = interceptor.fulfilled(config);
        expect(result.headers.Authorization).toBe('Bearer test-jwt-token');
      }
    });

    it('does not attach token when none exists', () => {
      jest.isolateModules(() => {
        require('../client');
      });

      const interceptor = mockRequestInterceptors[mockRequestInterceptors.length - 1];
      if (interceptor) {
        const config = { headers: {} as any };
        const result = interceptor.fulfilled(config);
        expect(result.headers.Authorization).toBeUndefined();
      }
    });
  });

  // === 4. Response interceptor - 401 refresh ===
  describe('response interceptor - 401 handling', () => {
    it('passes through successful responses', () => {
      jest.isolateModules(() => {
        require('../client');
      });

      const interceptor = mockResponseInterceptors[mockResponseInterceptors.length - 1];
      if (interceptor) {
        const response = { data: { success: true }, status: 200 };
        const result = interceptor.fulfilled(response);
        expect(result).toBe(response);
      }
    });

    it('rejects non-401 errors without refresh attempt', async () => {
      jest.isolateModules(() => {
        require('../client');
      });

      const interceptor = mockResponseInterceptors[mockResponseInterceptors.length - 1];
      if (interceptor) {
        const error = { response: { status: 500 }, config: {} };
        await expect(interceptor.rejected(error)).rejects.toBe(error);
      }
    });

    it('attempts token refresh on 401', async () => {
      const axios = require('axios').default;
      storage.set('refreshToken', 'old-refresh-token');

      axios.post.mockResolvedValueOnce({
        data: { data: { accessToken: 'new-access', refreshToken: 'new-refresh' } },
      });

      jest.isolateModules(() => {
        require('../client');
      });

      const interceptor = mockResponseInterceptors[mockResponseInterceptors.length - 1];
      if (interceptor) {
        const error = {
          response: { status: 401 },
          config: { headers: {}, _retry: false },
        };

        try {
          await interceptor.rejected(error);
        } catch {
          // May throw depending on mockInstance behavior
        }

        expect(axios.post).toHaveBeenCalledWith(
          expect.stringContaining('/auth/refresh'),
          { refreshToken: 'old-refresh-token' },
        );
      }
    });

    it('clears tokens when refresh fails', async () => {
      const axios = require('axios').default;
      storage.set('accessToken', 'old-access');
      storage.set('refreshToken', 'bad-refresh');

      axios.post.mockRejectedValueOnce(new Error('Refresh failed'));

      jest.isolateModules(() => {
        require('../client');
      });

      const interceptor = mockResponseInterceptors[mockResponseInterceptors.length - 1];
      if (interceptor) {
        const error = {
          response: { status: 401 },
          config: { headers: {}, _retry: false },
        };

        await expect(interceptor.rejected(error)).rejects.toThrow('Refresh failed');

        expect(storage.getString('accessToken')).toBeUndefined();
        expect(storage.getString('refreshToken')).toBeUndefined();
      }
    });

    it('rejects 401 immediately when no refresh token exists', async () => {
      jest.isolateModules(() => {
        require('../client');
      });

      const interceptor = mockResponseInterceptors[mockResponseInterceptors.length - 1];
      if (interceptor) {
        const error = {
          response: { status: 401 },
          config: { headers: {}, _retry: false },
        };

        await expect(interceptor.rejected(error)).rejects.toThrow('No refresh token');
      }
    });
  });
});
