// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => {
  const store = new Map();
  return {
    createMMKV: () => ({
      set: (key, value) => store.set(key, value),
      getString: (key) => store.get(key),
      getBoolean: (key) => store.get(key),
      getNumber: (key) => store.get(key),
      remove: (key) => store.delete(key),
      contains: (key) => store.has(key),
      clearAll: () => store.clear(),
      getAllKeys: () => [...store.keys()],
    }),
  };
});

// Mock expo modules
jest.mock('expo-font', () => ({
  loadAsync: jest.fn().mockResolvedValue(undefined),
  isLoaded: jest.fn().mockReturnValue(true),
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(undefined),
  hideAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
}));

jest.mock('expo-av', () => ({
  Audio: {
    Sound: { createAsync: jest.fn() },
    setAudioModeAsync: jest.fn(),
  },
}));

jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    GestureHandlerRootView: View,
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    PanGestureHandler: View,
    TapGestureHandler: View,
    FlatList: require('react-native').FlatList,
    ScrollView: require('react-native').ScrollView,
    TouchableOpacity: require('react-native').TouchableOpacity,
  };
});

jest.mock('lottie-react-native', () => 'LottieView');

// Silence console.warn in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Font loading failed')) return;
  originalWarn(...args);
};
