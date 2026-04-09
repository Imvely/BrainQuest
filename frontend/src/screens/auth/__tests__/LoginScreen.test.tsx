import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import LoginScreen from '../LoginScreen';
import { login } from '../../../api/auth';
import {
  setTokens,
  setIsNewUser as persistIsNewUser,
  setHasCharacter as persistHasCharacter,
} from '../../../utils/storage';

// --- Mocks ---

const mockSetUser = jest.fn();
const mockSetHasCharacter = jest.fn();
const mockSetIsNewUser = jest.fn();

jest.mock('../../../stores/useAuthStore', () => ({
  useAuthStore: () => ({
    setUser: mockSetUser,
    setHasCharacter: mockSetHasCharacter,
    setIsNewUser: mockSetIsNewUser,
  }),
}));

jest.mock('../../../api/auth', () => ({
  login: jest.fn(),
}));

jest.mock('../../../utils/storage', () => ({
  setTokens: jest.fn(),
  setIsNewUser: jest.fn(),
  setHasCharacter: jest.fn(),
}));

const mockLogin = login as jest.MockedFunction<typeof login>;
const mockSetTokens = setTokens as jest.MockedFunction<typeof setTokens>;
const mockPersistIsNewUser = persistIsNewUser as jest.MockedFunction<typeof persistIsNewUser>;
const mockPersistHasCharacter = persistHasCharacter as jest.MockedFunction<typeof persistHasCharacter>;

// --- Helpers ---

const SUCCESS_RESPONSE = {
  success: true,
  data: {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    user: {
      id: 1,
      email: 'user@kakao.com',
      nickname: '모험가',
      provider: 'KAKAO' as const,
      adhdStatus: 'UNKNOWN' as const,
      timezone: 'Asia/Seoul',
      wakeTime: '07:00',
      sleepTime: '23:00',
      createdAt: '2025-01-01T00:00:00',
      updatedAt: '2025-01-01T00:00:00',
    },
    isNewUser: true,
    hasCharacter: false,
  },
  message: 'Login successful',
};

// --- Tests ---

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. renders logo "BrainQuest" and subtitle
  it('renders logo "BrainQuest" and subtitle', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('BrainQuest')).toBeTruthy();
    expect(getByText('ADHD를 위한 올인원 라이프 RPG')).toBeTruthy();
  });

  // 2. shows Kakao and Google login buttons
  it('shows Kakao and Google login buttons', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('카카오로 시작하기')).toBeTruthy();
    expect(getByText('Google로 시작하기')).toBeTruthy();
  });

  // 3. pressing Kakao calls login API
  it('pressing Kakao button calls login API with provider KAKAO', async () => {
    mockLogin.mockResolvedValueOnce(SUCCESS_RESPONSE as any);
    const { getByText } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByText('카카오로 시작하기'));
    });

    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'KAKAO' }),
    );
  });

  // 4. shows ActivityIndicator during login (loadingProvider state)
  it('shows ActivityIndicator while login is in progress', async () => {
    let resolveLogin!: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValueOnce(pendingPromise as any);

    const { getByText, queryByText, UNSAFE_root } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByText('카카오로 시작하기'));
    });

    // The Kakao button text should be replaced by ActivityIndicator
    expect(queryByText('카카오로 시작하기')).toBeNull();

    // Cleanup: resolve the pending promise
    await act(async () => {
      resolveLogin(SUCCESS_RESPONSE);
    });
  });

  // 5. successful login stores tokens via storage utils
  it('stores tokens and persistence flags on successful login', async () => {
    mockLogin.mockResolvedValueOnce(SUCCESS_RESPONSE as any);
    const { getByText } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByText('카카오로 시작하기'));
    });

    expect(mockSetTokens).toHaveBeenCalledWith('test-access-token', 'test-refresh-token');
    expect(mockPersistIsNewUser).toHaveBeenCalledWith(true);
    expect(mockPersistHasCharacter).toHaveBeenCalledWith(false);
    expect(mockSetUser).toHaveBeenCalledWith(SUCCESS_RESPONSE.data.user);
    expect(mockSetIsNewUser).toHaveBeenCalledWith(true);
    expect(mockSetHasCharacter).toHaveBeenCalledWith(false);
  });

  // 6. failed login shows alert
  it('shows Alert on login failure', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    mockLogin.mockRejectedValueOnce(new Error('Network Error'));

    const { getByText } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByText('카카오로 시작하기'));
    });

    expect(alertSpy).toHaveBeenCalledWith('로그인 실패', '잠시 후 다시 시도해주세요.');
    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockSetTokens).not.toHaveBeenCalled();
  });

  // 7. buttons disabled while loading
  it('disables all buttons while a login request is in progress', async () => {
    let resolveLogin!: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValueOnce(pendingPromise as any);

    const { getByText } = render(<LoginScreen />);

    // Initiate login via Kakao
    await act(async () => {
      fireEvent.press(getByText('카카오로 시작하기'));
    });

    // Try pressing Google while Kakao login is in-flight
    await act(async () => {
      fireEvent.press(getByText('Google로 시작하기'));
    });

    // login should have been called only once (the Kakao press)
    expect(mockLogin).toHaveBeenCalledTimes(1);
    expect(mockLogin).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'KAKAO' }),
    );

    // Cleanup
    await act(async () => {
      resolveLogin(SUCCESS_RESPONSE);
    });
  });

  // Additional: pressing Google calls login API with GOOGLE provider
  it('pressing Google button calls login API with provider GOOGLE', async () => {
    mockLogin.mockResolvedValueOnce(SUCCESS_RESPONSE as any);
    const { getByText } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByText('Google로 시작하기'));
    });

    expect(mockLogin).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'GOOGLE' }),
    );
  });

  // Additional: failed login does not update store
  it('does not update auth store on failed login', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Server Error'));
    const { getByText } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByText('Google로 시작하기'));
    });

    expect(mockSetUser).not.toHaveBeenCalled();
    expect(mockSetIsNewUser).not.toHaveBeenCalled();
    expect(mockSetHasCharacter).not.toHaveBeenCalled();
  });

  // Additional: Apple button platform check
  it('only shows Apple button on iOS', () => {
    const { queryByText } = render(<LoginScreen />);
    if (Platform.OS === 'ios') {
      expect(queryByText(/Apple로 시작하기/)).toBeTruthy();
    } else {
      expect(queryByText(/Apple로 시작하기/)).toBeNull();
    }
  });
});
