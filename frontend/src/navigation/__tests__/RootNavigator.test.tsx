import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
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

import RootNavigator from '../RootNavigator';

describe('RootNavigator', () => {
  beforeEach(() => {
    storage.clearAll();
  });

  it('returns null while loading', () => {
    useAuthStore.setState({
      isLoggedIn: false,
      hasCharacter: false,
      isNewUser: true,
      isLoading: true,
      checkAuth: () => {},
    });
    const { toJSON } = render(<RootNavigator />);
    expect(toJSON()).toBeNull();
  });

  it('shows login screen when not logged in', async () => {
    useAuthStore.setState({
      isLoggedIn: false,
      hasCharacter: false,
      isNewUser: true,
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

  it('shows onboarding when logged in but no character (new user)', async () => {
    storage.set('accessToken', 'test-token');
    useAuthStore.setState({
      isLoggedIn: true,
      hasCharacter: false,
      isNewUser: true,
      isLoading: false,
      checkAuth: () => {
        useAuthStore.setState({ isLoggedIn: true, hasCharacter: false, isNewUser: true, isLoading: false });
      },
    });
    const { getByText } = render(<RootNavigator />);
    await waitFor(() => {
      expect(getByText('시작하기 전에')).toBeTruthy();
    });
  });

  it('shows main tab when logged in with character', async () => {
    storage.set('accessToken', 'test-token');
    storage.set('hasCharacter', true);
    useAuthStore.setState({
      isLoggedIn: true,
      hasCharacter: true,
      isNewUser: false,
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
