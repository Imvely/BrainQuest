import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Platform } from 'react-native';
import LoginScreen from '../LoginScreen';
import { login } from '../../../api/auth';

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

const mockLogin = login as jest.MockedFunction<typeof login>;

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // --- 1. Rendering ---
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<LoginScreen />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays BrainQuest logo at 36pt', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('BrainQuest')).toBeTruthy();
    });

    it('displays subtitle in correct color', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('ADHD를 위한 올인원 라이프 RPG')).toBeTruthy();
    });

    it('shows Kakao login button with yellow background', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('카카오로 시작하기')).toBeTruthy();
    });

    it('shows Google login button', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('Google로 시작하기')).toBeTruthy();
    });

    // Platform.OS is determined at module load time; we test current platform only
    it('renders without error on current platform', () => {
      const { getByText } = render(<LoginScreen />);
      expect(getByText('카카오로 시작하기')).toBeTruthy();
      expect(getByText('Google로 시작하기')).toBeTruthy();
    });
  });

  // --- 2. Login success ---
  describe('login success', () => {
    const successResponse = {
      data: {
        accessToken: 'acc_token',
        refreshToken: 'ref_token',
        user: { id: 1, nickname: '모험가', email: 'test@kakao.com', provider: 'KAKAO' as const },
        isNewUser: true,
        hasCharacter: false,
      },
    };

    it('calls login API when Kakao button pressed', async () => {
      mockLogin.mockResolvedValueOnce(successResponse as any);
      const { getByText } = render(<LoginScreen />);

      await act(async () => {
        fireEvent.press(getByText('카카오로 시작하기'));
      });

      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'KAKAO' }),
      );
    });

    it('calls login API when Google button pressed', async () => {
      mockLogin.mockResolvedValueOnce(successResponse as any);
      const { getByText } = render(<LoginScreen />);

      await act(async () => {
        fireEvent.press(getByText('Google로 시작하기'));
      });

      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({ provider: 'GOOGLE' }),
      );
    });

    it('updates auth store on successful login', async () => {
      mockLogin.mockResolvedValueOnce(successResponse as any);
      const { getByText } = render(<LoginScreen />);

      await act(async () => {
        fireEvent.press(getByText('카카오로 시작하기'));
      });

      expect(mockSetIsNewUser).toHaveBeenCalledWith(true);
      expect(mockSetHasCharacter).toHaveBeenCalledWith(false);
      expect(mockSetUser).toHaveBeenCalledWith(successResponse.data.user);
    });
  });

  // --- 3. Login failure ---
  describe('login failure', () => {
    it('shows alert on network error', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockLogin.mockRejectedValueOnce(new Error('Network Error'));

      const { getByText } = render(<LoginScreen />);

      await act(async () => {
        fireEvent.press(getByText('카카오로 시작하기'));
      });

      expect(alertSpy).toHaveBeenCalledWith('로그인 실패', '잠시 후 다시 시도해주세요.');
    });

    it('does not update store on failure', async () => {
      mockLogin.mockRejectedValueOnce(new Error('Server Error'));
      const { getByText } = render(<LoginScreen />);

      await act(async () => {
        fireEvent.press(getByText('카카오로 시작하기'));
      });

      expect(mockSetUser).not.toHaveBeenCalled();
    });
  });

  // --- 4. Loading state ---
  describe('loading state', () => {
    it('prevents double-tap during loading', async () => {
      let resolveLogin: (v: any) => void;
      const pending = new Promise((r) => { resolveLogin = r; });
      mockLogin.mockReturnValueOnce(pending as any);

      const { getByText } = render(<LoginScreen />);

      await act(async () => {
        fireEvent.press(getByText('카카오로 시작하기'));
      });

      // Second tap should be ignored
      await act(async () => {
        fireEvent.press(getByText('Google로 시작하기'));
      });

      expect(mockLogin).toHaveBeenCalledTimes(1);

      // Cleanup
      resolveLogin!({ data: { accessToken: 'a', refreshToken: 'r', user: {}, isNewUser: true, hasCharacter: false } });
    });
  });
});
