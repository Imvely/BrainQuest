import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../stores/useAuthStore';
import AuthStack from './AuthStack';
import OnboardingStack from './OnboardingStack';
import MainTab from './MainTab';

// DEV_BYPASS: 개발 모드에서만 로그인 없이 메인 화면 바로 진입
const DEV_BYPASS_AUTH = __DEV__;

export default function RootNavigator() {
  const { isLoggedIn, hasCharacter, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading && !DEV_BYPASS_AUTH) {
    return null;
  }

  return (
    <NavigationContainer>
      {DEV_BYPASS_AUTH ? (
        <MainTab />
      ) : !isLoggedIn ? (
        <AuthStack />
      ) : !hasCharacter ? (
        <OnboardingStack />
      ) : (
        <MainTab />
      )}
    </NavigationContainer>
  );
}
