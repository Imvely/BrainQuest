import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/useAuthStore';
import { storage } from '../../utils/storage';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  NavigationContainer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: ({ component: Comp }: { component: React.ComponentType }) => <Comp />,
  }),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: () => ({
    Navigator: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Screen: ({ component: Comp }: { component: React.ComponentType }) => <Comp />,
  }),
}));

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const makeFadeAnim = () => {
    const obj: any = { duration: () => obj, delay: () => obj, springify: () => obj };
    return obj;
  };
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (c: any) => c || RN.View,
      View: RN.View,
      Text: RN.Text,
      ScrollView: RN.ScrollView,
    },
    useSharedValue: (v: number) => ({ value: v }),
    useAnimatedProps: (fn: () => any) => { try { return fn(); } catch { return {}; } },
    useAnimatedStyle: (fn: () => any) => { try { return fn(); } catch { return {}; } },
    withTiming: (v: number) => v,
    withRepeat: (v: number) => v,
    withDelay: (_: number, v: number) => v,
    withSequence: (...args: number[]) => args[args.length - 1],
    Easing: { inOut: () => (v: number) => v, ease: (v: number) => v, linear: (v: number) => v },
    runOnJS: (fn: any) => fn,
    FadeIn: makeFadeAnim(),
    FadeInDown: makeFadeAnim(),
    FadeOut: makeFadeAnim(),
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((_: any, ref: any) => null),
    BottomSheetBackdrop: () => null,
    BottomSheetView: ({ children }: any) => children,
  };
});

import RootNavigator from '../RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('RootNavigator', () => {
  beforeEach(() => {
    storage.clearAll();
    queryClient.clear();
  });

  // Note: DEV_BYPASS_AUTH=true in RootNavigator always renders MainTab.
  // These tests verify that the component renders in various auth states.

  it('renders MainTab with timeline elements (dev bypass)', async () => {
    useAuthStore.setState({
      isLoggedIn: true,
      hasCharacter: true,
      isNewUser: false,
      isLoading: false,
      checkAuth: () => {},
    });
    const { getByText } = renderWithProviders(<RootNavigator />);
    await waitFor(() => {
      expect(getByText('전투 시작')).toBeTruthy();
    });
  });

  it('renders level badge and action buttons', async () => {
    useAuthStore.setState({
      isLoggedIn: true,
      hasCharacter: true,
      isNewUser: false,
      isLoading: false,
      checkAuth: () => {},
    });
    const { getByText } = renderWithProviders(<RootNavigator />);
    await waitFor(() => {
      expect(getByText('Lv.1')).toBeTruthy();
      expect(getByText('체크인')).toBeTruthy();
      expect(getByText('감정 기록')).toBeTruthy();
    });
  });
});
