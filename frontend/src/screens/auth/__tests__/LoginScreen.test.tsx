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
  getAccessToken: jest.fn(),
  getRefreshToken: jest.fn(),
  clearTokens: jest.fn(),
  getHasCharacter: jest.fn(() => false),
  getIsNewUser: jest.fn(() => true),
}));

const mockLogin = login as jest.MockedFunction<typeof login>;
const mockSetTokens = setTokens as jest.MockedFunction<typeof setTokens>;
const mockPersistIsNewUser = persistIsNewUser as jest.MockedFunction<typeof persistIsNewUser>;
const mockPersistHasCharacter = persistHasCharacter as jest.MockedFunction<typeof persistHasCharacter>;

// --- Helpers ---

// 백엔드 TokenResponse 구조: accessToken + refreshToken + userId + nickname + isNewUser
// (전체 User 엔티티는 반환하지 않음, hasCharacter 필드도 없음)
const SUCCESS_RESPONSE = {
  success: true,
  data: {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    userId: 1,
    nickname: '모험가',
    isNewUser: true,
  },
  message: 'Login successful',
};

// --- Tests ---

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // 1. Renders BrainQuest logo text
  it('renders BrainQuest logo text', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('BrainQuest')).toBeTruthy();
  });

  // 2. Renders subtitle
  it('renders subtitle "ADHD를 위한 올인원 라이프 RPG"', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('ADHD를 위한 올인원 라이프 RPG')).toBeTruthy();
  });

  // 3. Renders Kakao and Google login buttons
  it('renders Kakao and Google login buttons', () => {
    const { getByText } = render(<LoginScreen />);
    expect(getByText('카카오로 시작하기')).toBeTruthy();
    expect(getByText('Google로 시작하기')).toBeTruthy();
  });

  // 4. Apple button only shows on iOS
  describe('Apple login button platform behavior', () => {
    const originalOS = Platform.OS;

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', { value: originalOS });
    });

    it('shows Apple button on iOS', () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios' });
      const { queryByText } = render(<LoginScreen />);
      expect(queryByText(/Apple로 시작하기/)).toBeTruthy();
    });

    it('does not show Apple button on Android', () => {
      Object.defineProperty(Platform, 'OS', { value: 'android' });
      const { queryByText } = render(<LoginScreen />);
      expect(queryByText(/Apple로 시작하기/)).toBeNull();
    });
  });

  // 5. Tapping Kakao calls login API with provider KAKAO
  it('tapping Kakao calls login API with provider KAKAO', async () => {
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

  // 6. Shows ActivityIndicator while login in progress
  it('shows ActivityIndicator while login is in progress', async () => {
    let resolveLogin!: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockLogin.mockReturnValueOnce(pendingPromise as any);

    const { getByText, queryByText } = render(<LoginScreen />);

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

  // 7. On login success: calls setTokens, setUser, setIsNewUser, setHasCharacter
  it('on login success calls setTokens, setUser, setIsNewUser, setHasCharacter', async () => {
    mockLogin.mockResolvedValueOnce(SUCCESS_RESPONSE as any);
    const { getByText } = render(<LoginScreen />);

    await act(async () => {
      fireEvent.press(getByText('카카오로 시작하기'));
    });

    expect(mockSetTokens).toHaveBeenCalledWith('test-access-token', 'test-refresh-token');
    expect(mockPersistIsNewUser).toHaveBeenCalledWith(true);
    expect(mockPersistHasCharacter).toHaveBeenCalledWith(false); // 백엔드 미제공 → 기본 false
    expect(mockSetIsNewUser).toHaveBeenCalledWith(true);
    expect(mockSetHasCharacter).toHaveBeenCalledWith(false);
    // setUser는 백엔드 응답의 userId + nickname 만으로 User 객체 구성
    expect(mockSetUser).toHaveBeenCalledWith({ id: 1, nickname: '모험가' });
  });

  // 8. On login failure: shows Alert
  it('on login failure shows Alert', async () => {
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

  // 9. Disables all buttons while one login is in progress
  it('disables all buttons while one login is in progress', async () => {
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
});
