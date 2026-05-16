// Reanimated
jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  mock.default.call = () => {};
  return mock;
});

// react-native-svg — replace every export with a plain View/no-op
jest.mock('react-native-svg', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const stub = (name: string) =>
    ({ children, ...props }: any) =>
      React.createElement(View, { testID: name, ...props }, children);
  return {
    __esModule: true,
    default: stub('Svg'),
    Svg:            stub('Svg'),
    Path:           stub('Path'),
    Circle:         stub('Circle'),
    Ellipse:        stub('Ellipse'),
    Rect:           stub('Rect'),
    Line:           stub('Line'),
    G:              stub('G'),
    Defs:           stub('Defs'),
    RadialGradient: stub('RadialGradient'),
    Stop:           stub('Stop'),
    Text:           ({ children, ...props }: any) =>
      React.createElement(Text, props, children),
  };
});

// Safe area context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

// Gesture handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
  TouchableOpacity: require('react-native').TouchableOpacity,
  ScrollView: require('react-native').ScrollView,
}));

// Expo Router
jest.mock('expo-router', () => ({
  useRouter:           () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname:         () => '/',
  Link:                ({ children }: any) => children,
  Stack:               { Screen: () => null },
  Tabs:                { Screen: () => null },
}));

// Expo modules
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

// Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithOAuth: jest.fn(),
    },
  },
  fetchProfile:             jest.fn(),
  fetchSubscription:        jest.fn(),
  createTrialSubscription:  jest.fn(),
  savePlan:                 jest.fn(),
  fetchActivePlan:          jest.fn(),
  fetchWeeklyPain:          jest.fn().mockResolvedValue([0,0,0,0,0,0,0]),
  fetchRecentSessions:      jest.fn().mockResolvedValue([]),
  completeSession:          jest.fn(),
  saveExerciseLogs:         jest.fn(),
  signInWithEmail:          jest.fn(),
  signUpWithEmail:          jest.fn(),
  signOut:                  jest.fn(),
  signInWithOAuth:          jest.fn(),
}));

// RevenueCat
jest.mock('@/lib/revenuecat', () => ({
  initRevenueCat:           jest.fn(),
  identifyRevenueCatUser:   jest.fn(),
  fetchPackages:            jest.fn().mockResolvedValue({ monthly: null, yearly: null }),
  purchasePackage:          jest.fn(),
  restorePurchases:         jest.fn(),
  hasActiveEntitlement:     jest.fn().mockReturnValue(false),
  addCustomerInfoListener:  jest.fn().mockReturnValue(jest.fn()),
  getCustomerInfo:          jest.fn(),
  extractSubscriptionStatus: jest.fn().mockReturnValue({ isActive: false, planType: null, expiresAt: null }),
}));

// Silence act() warnings in store tests
global.IS_REACT_ACT_ENVIRONMENT = false;
