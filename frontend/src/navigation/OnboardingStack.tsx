import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import ScreeningScreen from '../screens/onboarding/ScreeningScreen';
import StyleQuizScreen from '../screens/onboarding/StyleQuizScreen';
import CharacterCreateScreen from '../screens/onboarding/CharacterCreateScreen';

export type OnboardingStackParamList = {
  Screening: undefined;
  StyleQuiz: undefined;
  CharacterCreate: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator
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
