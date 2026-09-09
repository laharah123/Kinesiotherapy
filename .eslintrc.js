/**
 * ESLint 8 (legacy .eslintrc) config — matches the installed
 * eslint@^8.57 / eslint-config-expo@~8.0.1 pair.
 *
 * Run with: npm run lint
 */
module.exports = {
  root: true,
  extends: 'expo',
  ignorePatterns: [
    'node_modules/',
    '.expo/',
    'dist/',
    'web-build/',
    'coverage/',
    'assets/',
    'expo-env.d.ts',
  ],
  overrides: [
    {
      // Node-side tooling, not React Native.
      files: ['scripts/**/*.mjs', '*.config.js', 'jest.env.js'],
      env: { node: true },
    },
    {
      files: ['__tests__/**/*.{ts,tsx}', 'jest.setup.ts', '__mocks__/**/*.js'],
      env: { jest: true, node: true },
    },
  ],
};
