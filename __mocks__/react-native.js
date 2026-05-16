'use strict';

const React = require('react');

// Minimal stub component factory
function stub(displayName) {
  const Comp = ({ children, testID, ...props }) =>
    React.createElement('View', { testID: testID || displayName, ...props }, children);
  Comp.displayName = displayName;
  return Comp;
}

function stubText(displayName) {
  const Comp = ({ children, testID, ...props }) =>
    React.createElement('Text', { testID: testID || displayName, ...props }, children);
  Comp.displayName = displayName;
  return Comp;
}

const TouchableOpacity = ({ children, onPress, testID, disabled, ...props }) =>
  React.createElement(
    'View',
    {
      testID,
      onPress: disabled ? undefined : onPress,
      accessibilityRole: 'button',
      accessibilityState: { disabled: !!disabled },
      ...props,
    },
    children,
  );
TouchableOpacity.displayName = 'TouchableOpacity';

const TouchableHighlight = TouchableOpacity;
const TouchableWithoutFeedback = TouchableOpacity;

const TextInput = ({ testID, onChangeText, value, placeholder, ...props }) =>
  React.createElement('input', {
    testID,
    onChange: e => onChangeText && onChangeText(e.target.value),
    value,
    placeholder,
    ...props,
  });

const ScrollView = ({ children, testID, horizontal, ...props }) =>
  React.createElement('View', { testID: testID || 'ScrollView', ...props }, children);

const FlatList = ({ data = [], renderItem, keyExtractor, testID, ListEmptyComponent, ...props }) => {
  if (!data || data.length === 0) {
    if (ListEmptyComponent) {
      return React.createElement(
        'View',
        { testID: testID || 'FlatList' },
        typeof ListEmptyComponent === 'function'
          ? React.createElement(ListEmptyComponent)
          : ListEmptyComponent,
      );
    }
    return React.createElement('View', { testID: testID || 'FlatList' });
  }
  return React.createElement(
    'View',
    { testID: testID || 'FlatList' },
    data.map((item, index) =>
      renderItem({ item, index, separators: { highlight: () => {}, unhighlight: () => {} } }),
    ),
  );
};

const Animated = {
  View: stub('Animated.View'),
  Text: stubText('Animated.Text'),
  Image: stub('Animated.Image'),
  ScrollView: stub('Animated.ScrollView'),
  Value: class {
    constructor(val) { this._val = val; }
    setValue(v) { this._val = v; }
    interpolate() { return this; }
    addListener() { return { remove: () => {} }; }
    removeListener() {}
    __getValue() { return this._val; }
  },
  ValueXY: class {
    constructor() { this.x = new Animated.Value(0); this.y = new Animated.Value(0); }
    getLayout() { return {}; }
    getTranslateTransform() { return []; }
  },
  timing: (val, config) => ({ start: cb => { if (config.toValue !== undefined) val.setValue(config.toValue); cb && cb({ finished: true }); }, stop: () => {}, reset: () => {} }),
  spring: (val, config) => ({ start: cb => { if (config.toValue !== undefined) val.setValue(config.toValue); cb && cb({ finished: true }); }, stop: () => {}, reset: () => {} }),
  decay: () => ({ start: cb => cb && cb({ finished: true }), stop: () => {}, reset: () => {} }),
  parallel: (anims) => ({ start: cb => { anims.forEach(a => a.start()); cb && cb({ finished: true }); }, stop: () => {} }),
  sequence: (anims) => ({ start: cb => { anims.forEach(a => a.start()); cb && cb({ finished: true }); }, stop: () => {} }),
  loop: (anim) => ({ start: cb => anim.start(cb), stop: () => {}, reset: () => {} }),
  delay: () => ({ start: cb => cb && cb({ finished: true }), stop: () => {} }),
  event: () => () => {},
  createAnimatedComponent: (C) => C,
  add: (a, b) => a,
  multiply: (a, b) => a,
  subtract: (a, b) => a,
  divide: (a, b) => a,
  modulo: (a, b) => a,
  diffClamp: (a) => a,
};

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => {
    if (!style) return {};
    if (Array.isArray(style)) return Object.assign({}, ...style.filter(Boolean));
    return style;
  },
  hairlineWidth: 1,
  absoluteFill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  absoluteFillObject: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
};

const Platform = {
  OS: 'ios',
  Version: 14,
  isPad: false,
  isTVOS: false,
  isTV: false,
  select: (obj) => obj.ios || obj.native || obj.default,
};

const Dimensions = {
  get: (dim) => dim === 'window' ? { width: 375, height: 812, scale: 2, fontScale: 1 } : { width: 375, height: 812 },
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const Keyboard = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  dismiss: jest.fn(),
};

const Linking = {
  openURL: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
  getInitialURL: jest.fn().mockResolvedValue(null),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};

const Alert = {
  alert: jest.fn(),
};

const NativeModules = {
  SettingsManager: { settings: {}, setValues: jest.fn() },
  UIManager: { getViewManagerConfig: jest.fn(() => ({ Commands: {} })), hasViewManagerConfig: jest.fn(() => false), createView: jest.fn(), updateView: jest.fn(), manageChildren: jest.fn() },
  RNCNetInfo: {},
  RNGestureHandlerModule: { attachGestureHandler: jest.fn(), createGestureHandler: jest.fn(), dropGestureHandler: jest.fn(), updateGestureHandler: jest.fn(), forceTouchAvailable: false },
};

const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};

const AccessibilityInfo = {
  fetch: jest.fn().mockResolvedValue(false),
  isScreenReaderEnabled: jest.fn().mockResolvedValue(false),
  isReduceMotionEnabled: jest.fn().mockResolvedValue(false),
  isBoldTextEnabled: jest.fn().mockResolvedValue(false),
  isGrayscaleEnabled: jest.fn().mockResolvedValue(false),
  isInvertColorsEnabled: jest.fn().mockResolvedValue(false),
  isReduceTransparencyEnabled: jest.fn().mockResolvedValue(false),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  announceForAccessibility: jest.fn(),
  setAccessibilityFocus: jest.fn(),
};

const useColorScheme = jest.fn(() => 'light');
const useWindowDimensions = jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 }));

module.exports = {
  // Core components
  View: stub('View'),
  Text: stubText('Text'),
  Image: stub('Image'),
  ScrollView,
  FlatList,
  SectionList: stub('SectionList'),
  TextInput,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  Pressable: TouchableOpacity,
  SafeAreaView: stub('SafeAreaView'),
  Modal: stub('Modal'),
  ActivityIndicator: stub('ActivityIndicator'),
  Switch: ({ value, onValueChange, testID }) =>
    React.createElement('View', { testID: testID || 'Switch', role: 'switch', 'aria-checked': value }),

  // Animated
  Animated,

  // StyleSheet / layout
  StyleSheet,
  Platform,
  Dimensions,

  // APIs
  Keyboard,
  Linking,
  Alert,
  AppState,
  AccessibilityInfo,
  NativeModules,

  // Hooks
  useColorScheme,
  useWindowDimensions,

  // Utilities
  I18nManager: { isRTL: false },
  PixelRatio: { get: () => 2, roundToNearestPixel: n => n, getPixelSizeForLayoutSize: n => n * 2 },
  InteractionManager: { runAfterInteractions: cb => { cb(); return { cancel: () => {} }; }, createInteractionHandle: jest.fn(), clearInteractionHandle: jest.fn() },
  BackHandler: { addEventListener: jest.fn(() => ({ remove: jest.fn() })), exitApp: jest.fn() },
  Vibration: { vibrate: jest.fn(), cancel: jest.fn() },
  Appearance: { getColorScheme: jest.fn(() => 'light'), addChangeListener: jest.fn(() => ({ remove: jest.fn() })) },
  Share: { share: jest.fn() },
  Clipboard: { setString: jest.fn(), getString: jest.fn().mockResolvedValue('') },

  // Transforms / colors
  processColor: (c) => c,
  PanResponder: { create: jest.fn(() => ({ panHandlers: {} })) },

  // require image
  Image: Object.assign(stub('Image'), {
    getSize: jest.fn(),
    prefetch: jest.fn(),
    resolveAssetSource: jest.fn(() => ({ uri: '', width: 0, height: 0 })),
  }),
};
