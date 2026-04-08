// Mock axios to avoid fetch adapter crash in Expo test environment
jest.mock('axios', () => {
  const mockInterceptors = {
    request: { use: jest.fn(), eject: jest.fn() },
    response: { use: jest.fn(), eject: jest.fn() },
  };
  const mockResponse = { data: { success: true, data: {}, message: '' } };
  const mockInstance = {
    get: jest.fn().mockResolvedValue(mockResponse),
    post: jest.fn().mockResolvedValue(mockResponse),
    put: jest.fn().mockResolvedValue(mockResponse),
    delete: jest.fn().mockResolvedValue(mockResponse),
    patch: jest.fn().mockResolvedValue(mockResponse),
    interceptors: mockInterceptors,
    defaults: { headers: { common: {} } },
  };
  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockInstance),
      get: jest.fn().mockResolvedValue(mockResponse),
      post: jest.fn().mockResolvedValue(mockResponse),
      isAxiosError: jest.fn(() => false),
    },
    AxiosError: class AxiosError extends Error {},
  };
});

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
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
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

// Mock react-native-reanimated (v4 compatible)
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const AnimatedView = RN.View;
  const AnimatedText = RN.Text;
  const AnimatedScrollView = RN.ScrollView;
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (component) => component,
      addWhitelistedNativeProps: jest.fn(),
      addWhitelistedUIProps: jest.fn(),
      call: jest.fn(),
      View: AnimatedView,
      Text: AnimatedText,
      ScrollView: AnimatedScrollView,
    },
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    withTiming: (v) => v,
    withSpring: (v) => v,
    withDelay: (_, v) => v,
    withSequence: (...args) => args[args.length - 1],
    Easing: { out: (fn) => fn, cubic: (v) => v, linear: (v) => v, bezier: () => (v) => v },
    createAnimatedComponent: (component) => component,
    runOnJS: (fn) => fn,
    FadeIn: { duration: () => ({ delay: () => ({}) }) },
    FadeOut: { duration: () => ({ delay: () => ({}) }) },
    Layout: {},
  };
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

jest.mock('react-native-view-shot', () => {
  const React = require('react');
  const { View } = require('react-native');
  const ViewShot = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref })
  );
  ViewShot.displayName = 'ViewShot';
  return {
    __esModule: true,
    default: ViewShot,
    captureRef: jest.fn().mockResolvedValue('/tmp/test.png'),
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// Silence console.warn in tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Font loading failed')) return;
  originalWarn(...args);
};
