import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BattleScreen from '../BattleScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBattleStore } from '../../../stores/useBattleStore';

jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  return {
    SafeAreaView: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    SafeAreaProvider: ({ children }: any) => children,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    getParent: () => ({ navigate: jest.fn() }),
  }),
  useRoute: () => ({ params: undefined }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('BattleScreen', () => {
  beforeEach(() => {
    useBattleStore.getState().reset();
  });

  // --- SETUP Phase ---
  describe('SETUP phase', () => {
    it('renders "전투 준비" title', () => {
      const { getByText } = renderWithProviders(<BattleScreen />);
      expect(getByText('전투 준비')).toBeTruthy();
    });

    it('displays all time presets', () => {
      const { getByText } = renderWithProviders(<BattleScreen />);
      expect(getByText('15분')).toBeTruthy();
      expect(getByText('25분 ★')).toBeTruthy();
      expect(getByText('40분')).toBeTruthy();
      expect(getByText('50분')).toBeTruthy();
    });

    it('displays "전투 시작!" button', () => {
      const { getByText } = renderWithProviders(<BattleScreen />);
      expect(getByText('전투 시작!')).toBeTruthy();
    });

    it('shows monster info for selected time', () => {
      const { getByText } = renderWithProviders(<BattleScreen />);
      // Default 25min = D grade = 고블린
      expect(getByText('고블린')).toBeTruthy();
    });

    it('changes monster on time preset change', () => {
      const { getByText } = renderWithProviders(<BattleScreen />);
      // Tap 50분 → C grade → 오크
      fireEvent.press(getByText('50분'));
      expect(getByText('오크')).toBeTruthy();
    });

    it('shows monster emoji for selected grade', () => {
      const { getByText } = renderWithProviders(<BattleScreen />);
      // 25min = D grade = 고블린 with emoji 👺
      expect(getByText('고블린')).toBeTruthy();
    });
  });
});
