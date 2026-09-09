// Reanimated.
// The mock shipped with the package re-exports the real entry point, which
// needs the native module and throws under Jest, so this is a self-contained
// stand-in: shared values are plain boxes and every animation helper resolves
// immediately to its target value.
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const RN = require('react-native');

  const NOOP = () => {};
  const ID = <T,>(v: T) => v;
  const CALL = <T,>(fn: () => T) => fn();

  const createAnimatedComponent = (Component: any) => {
    const Wrapped = React.forwardRef((props: any, ref: any) => {
      const { animatedProps, ...rest } = props ?? {};
      return React.createElement(Component, { ...rest, ...(animatedProps ?? {}), ref });
    });
    Wrapped.displayName = 'Animated(Component)';
    return Wrapped;
  };

  const Easing = {
    linear: ID, ease: ID, quad: ID, cubic: ID, sin: ID, ircle: ID,
    circle: ID, exp: ID, bounce: ID, elastic: () => ID, back: () => ID,
    poly: () => ID, bezier: () => ({ factory: () => ID }),
    in: ID, out: ID, inOut: ID,
  };

  const AnimatedDefault: any = {
    createAnimatedComponent,
    View: RN.View,
    Text: RN.Text,
    Image: RN.Image,
    ScrollView: RN.ScrollView,
    call: NOOP,
  };

  return {
    __esModule: true,
    default: AnimatedDefault,
    createAnimatedComponent,
    Easing,
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    useSharedValue: (init: any) => ({ value: init, get: () => init, set: NOOP }),
    useDerivedValue: (processor: () => any) => ({ value: processor() }),
    useAnimatedProps: CALL,
    useAnimatedStyle: CALL,
    useAnimatedRef: () => ({ current: null }),
    useAnimatedReaction: NOOP,
    useReducedMotion: () => false,
    useFrameCallback: () => ({ setActive: NOOP, isActive: false }),
    cancelAnimation: NOOP,
    withTiming: (to: any) => to,
    withSpring: (to: any) => to,
    withDelay: (_ms: number, next: any) => next,
    withSequence: (...steps: any[]) => steps[steps.length - 1],
    withRepeat: ID,
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    interpolate: (v: number, input: number[], output: number[]) => {
      if (!input.length || !output.length) return v;
      if (v <= input[0]) return output[0];
      const last = input.length - 1;
      if (v >= input[last]) return output[last];
      for (let i = 1; i <= last; i++) {
        if (v <= input[i]) {
          const t = (v - input[i - 1]) / (input[i] - input[i - 1]);
          return output[i - 1] + (output[i] - output[i - 1]) * t;
        }
      }
      return output[last];
    },
    interpolateColor: (_v: number, _i: number[], output: string[]) => output[0],
  };
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
  createSession:            jest.fn().mockResolvedValue({ id: 'session-test' }),
  localDateString:          (d: Date = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
  isSupabaseConfigured:     true,
  sendPasswordReset:        jest.fn(),
  updatePlanAdaptation:     jest.fn(),
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
  applyCustomerInfoToStore: jest.fn().mockReturnValue(false),
  isPurchasesConfigured:    jest.fn().mockReturnValue(false),
  resetRevenueCatUser:      jest.fn(),
  fetchOffering:            jest.fn().mockResolvedValue(null),
  STORE_NAME:               'App Store',
  MANAGE_SUBSCRIPTION_URL:  'https://apps.apple.com/account/subscriptions',
}));

// Silence act() warnings in store tests
global.IS_REACT_ACT_ENVIRONMENT = false;
