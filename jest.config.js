/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  setupFiles: ['<rootDir>/jest.env.js'],
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    // Path alias
    '^@/(.*)$': '<rootDir>/$1',
    // Static assets
    '\\.(png|jpg|jpeg|gif|svg|ttf|otf|woff|woff2)$': '<rootDir>/__mocks__/fileMock.js',
    // React Native — use our stub to avoid native module loading
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native/(.*)$': '<rootDir>/__mocks__/react-native.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
      },
      diagnostics: false,
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', { configFile: './babel.config.js' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-svg|react-native-reanimated|react-native-safe-area-context|react-native-gesture-handler|expo|@expo|expo-router|expo-font|expo-status-bar|expo-splash-screen|expo-linear-gradient)/)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'data/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
