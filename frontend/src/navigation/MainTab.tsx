import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Colors } from '../constants/colors';
import { Fonts, FontSize } from '../constants/fonts';

import TimelineScreen from '../screens/map/TimelineScreen';
import QuestBoardScreen from '../screens/quest/QuestBoardScreen';
import QuestDetailScreen from '../screens/quest/QuestDetailScreen';
import QuestCreateScreen from '../screens/quest/QuestCreateScreen';
import BattleScreen from '../screens/battle/BattleScreen';
import BattleResultScreen from '../screens/battle/BattleResultScreen';
import EmotionRecordScreen from '../screens/sky/EmotionRecordScreen';
import EmotionCalendarScreen from '../screens/sky/EmotionCalendarScreen';
import WeeklySummaryScreen from '../screens/sky/WeeklySummaryScreen';
import CharacterScreen from '../screens/character/CharacterScreen';
import InventoryScreen from '../screens/character/InventoryScreen';
import CheckinScreen from '../screens/gate/CheckinScreen';
import MedicationScreen from '../screens/gate/MedicationScreen';

// --- Sub-stacks ---

export type MapStackParamList = {
  Timeline: undefined;
};
const MapStack = createStackNavigator<MapStackParamList>();
function MapNavigator() {
  return (
    <MapStack.Navigator screenOptions={{ headerShown: false }}>
      <MapStack.Screen name="Timeline" component={TimelineScreen} />
    </MapStack.Navigator>
  );
}

export type QuestStackParamList = {
  QuestBoard: undefined;
  QuestDetail: { questId: number };
  QuestCreate: undefined;
};
const QuestStack = createStackNavigator<QuestStackParamList>();
function QuestNavigator() {
  return (
    <QuestStack.Navigator screenOptions={{ headerShown: false }}>
      <QuestStack.Screen name="QuestBoard" component={QuestBoardScreen} />
      <QuestStack.Screen name="QuestDetail" component={QuestDetailScreen} />
      <QuestStack.Screen name="QuestCreate" component={QuestCreateScreen} />
    </QuestStack.Navigator>
  );
}

export type BattleStackParamList = {
  BattleHome: undefined;
  BattleResult: { sessionId: number };
};
const BattleStack = createStackNavigator<BattleStackParamList>();
function BattleNavigator() {
  return (
    <BattleStack.Navigator screenOptions={{ headerShown: false }}>
      <BattleStack.Screen name="BattleHome" component={BattleScreen} />
      <BattleStack.Screen name="BattleResult" component={BattleResultScreen} />
    </BattleStack.Navigator>
  );
}

export type SkyStackParamList = {
  EmotionRecord: undefined;
  EmotionCalendar: undefined;
  WeeklySummary: undefined;
};
const SkyStack = createStackNavigator<SkyStackParamList>();
function SkyNavigator() {
  return (
    <SkyStack.Navigator screenOptions={{ headerShown: false }}>
      <SkyStack.Screen name="EmotionRecord" component={EmotionRecordScreen} />
      <SkyStack.Screen name="EmotionCalendar" component={EmotionCalendarScreen} />
      <SkyStack.Screen name="WeeklySummary" component={WeeklySummaryScreen} />
    </SkyStack.Navigator>
  );
}

export type MoreStackParamList = {
  Character: undefined;
  Inventory: undefined;
  Checkin: undefined;
  Medication: undefined;
};
const MoreStack = createStackNavigator<MoreStackParamList>();
function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="Character" component={CharacterScreen} />
      <MoreStack.Screen name="Inventory" component={InventoryScreen} />
      <MoreStack.Screen name="Checkin" component={CheckinScreen} />
      <MoreStack.Screen name="Medication" component={MedicationScreen} />
    </MoreStack.Navigator>
  );
}

// --- Main Tab ---

export type MainTabParamList = {
  Map: undefined;
  Quest: undefined;
  Battle: undefined;
  Sky: undefined;
  More: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = memo(({ focused }: { focused: boolean }) => (
  <View style={styles.tabIcon}>
    <View style={[styles.iconDot, { backgroundColor: focused ? Colors.PRIMARY : Colors.TAB_INACTIVE }]} />
  </View>
));

const BattleTabIcon = memo(({ focused }: { focused: boolean }) => (
  <View style={styles.battleIcon}>
    <View style={[styles.iconDot, styles.battleDot, { backgroundColor: focused ? Colors.ACCENT : Colors.TAB_INACTIVE }]} />
  </View>
));

export default function MainTab() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.TAB_ACTIVE,
        tabBarInactiveTintColor: Colors.TAB_INACTIVE,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Map"
        component={MapNavigator}
        options={{
          tabBarLabel: 'MAP',
          tabBarIcon: TabIcon,
        }}
      />
      <Tab.Screen
        name="Quest"
        component={QuestNavigator}
        options={{
          tabBarLabel: 'QUEST',
          tabBarIcon: TabIcon,
        }}
      />
      <Tab.Screen
        name="Battle"
        component={BattleNavigator}
        options={{
          tabBarLabel: 'BATTLE',
          tabBarIcon: BattleTabIcon,
        }}
      />
      <Tab.Screen
        name="Sky"
        component={SkyNavigator}
        options={{
          tabBarLabel: 'SKY',
          tabBarIcon: TabIcon,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          tabBarLabel: 'MORE',
          tabBarIcon: TabIcon,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.BG_SECONDARY,
    borderTopColor: Colors.BORDER,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontFamily: Fonts.BOLD,
    fontSize: FontSize.XS,
  },
  tabIcon: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  battleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.BG_CARD,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.ACCENT,
  },
  battleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
