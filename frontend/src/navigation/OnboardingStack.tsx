import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ScreeningScreen from '../screens/onboarding/ScreeningScreen';
import StyleQuizScreen from '../screens/onboarding/StyleQuizScreen';
import CharacterCreateScreen from '../screens/onboarding/CharacterCreateScreen';
import { useAuthStore } from '../stores/useAuthStore';
import { ClassType } from '../types/character';

export type OnboardingStackParamList = {
  Screening: undefined;
  StyleQuiz: undefined;
  CharacterCreate: { classType?: ClassType } | undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  const { isNewUser } = useAuthStore();

  return (
    <Stack.Navigator
      initialRouteName={isNewUser ? 'Screening' : 'CharacterCreate'}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Screening" component={ScreeningScreen} />
      <Stack.Screen name="StyleQuiz" component={StyleQuizScreen} />
      <Stack.Screen name="CharacterCreate" component={CharacterCreateScreen} />
    </Stack.Navigator>
  );
}
