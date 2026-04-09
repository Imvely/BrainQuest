import React from 'react';
import { render } from '@testing-library/react-native';
import BattleScreen from '../BattleScreen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  ImpactFeedbackStyle: { Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning' },
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    getParent: () => ({ navigate: jest.fn() }),
  }),
  useRoute: () => ({ params: undefined }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('BattleScreen', () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it('renders SETUP phase with title', () => {
    const { getByText } = render(
      <Wrapper><BattleScreen /></Wrapper>,
    );
    expect(getByText('전투 준비')).toBeTruthy();
  });

  it('displays time presets', () => {
    const { getByText } = render(
      <Wrapper><BattleScreen /></Wrapper>,
    );
    expect(getByText('25분 ★')).toBeTruthy();
    expect(getByText('15분')).toBeTruthy();
  });

  it('displays start button', () => {
    const { getByText } = render(
      <Wrapper><BattleScreen /></Wrapper>,
    );
    expect(getByText('전투 시작!')).toBeTruthy();
  });
});
