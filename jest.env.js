'use strict';

// Set environment variables before any test modules load
process.env.RNTL_SKIP_DEPS_CHECK = 'true';

// React Native globals required at module load time
global.__DEV__ = true;
global.__RCTProfileIsProfiling = false;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;

if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = id => clearTimeout(id);
}
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = callback => setTimeout(() => callback(Date.now()), 0);
}
if (typeof global.performance === 'undefined') {
  global.performance = { now: Date.now.bind(Date) };
}

// react-test-renderer v19 uses React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
// (the React 19 internals object) for transition / dispatcher hooks like .S, .H, .actQueue.
// React 18 does not expose this key, so the import of react-test-renderer crashes with
// "Cannot read properties of undefined (reading 'S')".
// Shim the missing key by aliasing from React 18's __SECRET_INTERNALS object.
try {
  const React = require('react');
  const key = '__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE';
  if (!React[key]) {
    const v18 = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED || {};
    React[key] = {
      ...v18,
      S:        null,   // startTransition finish hook
      H:        null,   // dispatcher
      A:        null,   // async dispatcher
      T:        null,   // transition
      actQueue: null,   // act queue
      getCurrentStack: (v18.ReactDebugCurrentFrame && v18.ReactDebugCurrentFrame.getStackAddendum) || null,
    };
  }
} catch (_) {
  // ignore — only needed for component tests
}
