import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '../../stores/useAuthStore';
import { storage } from '../../utils/storage';

// Mock navigation - Screen renders its component prop
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

import RootNavigator from '../RootNavigator';

describe('RootNavigator', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns null while loading (before checkAuth completes)', () => {
    // Set isLoading=true and override checkAuth to be a no-op
    useAuthStore.setState({
      isLoggedIn: false,
      hasCharacter: false,
      isLoading: true,
      checkAuth: () => {}, // prevent useEffect from changing state
    });
    const { toJSON } = render(<RootNavigator />);
    expect(toJSON()).toBeNull();
  });

  it('shows login screen when not logged in', async () => {
    // No token in storage → checkAuth sets isLoggedIn=false
    useAuthStore.setState({
      isLoggedIn: false,
      hasCharacter: false,
      isLoading: false,
      checkAuth: () => {
        useAuthStore.setState({ isLoggedIn: false, isLoading: false });
      },
    });
    const { getByText } = render(<RootNavigator />);
    await waitFor(() => {
      expect(getByText('BrainQuest')).toBeTruthy();
    });
  });

  it('shows onboarding when logged in but no character', async () => {
    storage.set('accessToken', 'test-token');
    useAuthStore.setState({
      isLoggedIn: true,
      hasCharacter: false,
      isLoading: false,
      checkAuth: () => {
        useAuthStore.setState({ isLoggedIn: true, hasCharacter: false, isLoading: false });
      },
    });
    const { getByText } = render(<RootNavigator />);
    await waitFor(() => {
      expect(getByText('ASRS 스크리닝')).toBeTruthy();
    });
  });

  it('shows main tab when logged in with character', async () => {
    storage.set('accessToken', 'test-token');
    storage.set('hasCharacter', true);
    useAuthStore.setState({
      isLoggedIn: true,
      hasCharacter: true,
      isLoading: false,
      checkAuth: () => {
        useAuthStore.setState({ isLoggedIn: true, hasCharacter: true, isLoading: false });
      },
    });
    const { getByText } = render(<RootNavigator />);
    await waitFor(() => {
      expect(getByText('오늘의 모험 지도')).toBeTruthy();
    });
  });
});
