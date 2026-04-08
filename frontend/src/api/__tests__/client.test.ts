import { storage } from '../../utils/storage';

// Mock axios to avoid fetch adapter crash in Jest environment
jest.mock('axios', () => {
  const requestInterceptors: Array<{ fulfilled: Function }> = [];
  const responseInterceptors: Array<{ fulfilled: Function; rejected: Function }> = [];

  const instance: any = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn((fn: Function) => {
          requestInterceptors.push({ fulfilled: fn });
          return requestInterceptors.length - 1;
        }),
        eject: jest.fn(),
        handlers: requestInterceptors,
      },
      response: {
        use: jest.fn((fn: Function, errFn: Function) => {
          responseInterceptors.push({ fulfilled: fn, rejected: errFn });
          return responseInterceptors.length - 1;
        }),
        eject: jest.fn(),
        handlers: responseInterceptors,
      },
    },
    defaults: { headers: { common: {} } },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => instance),
      post: jest.fn(),
    },
  };
});

describe('API client', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('creates an axios instance', () => {
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
});
