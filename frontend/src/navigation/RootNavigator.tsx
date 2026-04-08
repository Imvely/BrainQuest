import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../stores/useAuthStore';
import AuthStack from './AuthStack';
import OnboardingStack from './OnboardingStack';
import MainTab from './MainTab';

export default function RootNavigator() {
  const { isLoggedIn, hasCharacter, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      {!isLoggedIn ? (
        <AuthStack />
      ) : !hasCharacter ? (
        <OnboardingStack />
      ) : (
        <MainTab />
      )}
    </NavigationContainer>
  );
}
