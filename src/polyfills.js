/**
 * Global polyfills for legacy browsers (Safari 10/11, IE11, etc.)
 *
 * This file MUST be imported before React or any application code,
 * so that missing APIs are patched before first use.
 */

// Modern ES features (Promise, Symbol, Object.assign, Array.from, etc.)
import 'core-js/stable';

// Support for async/await, generators
import 'regenerator-runtime/runtime';

// ---- Browser API Polyfills ----

// Safari 10/11: Notification API not fully implemented
if (typeof window !== 'undefined' && typeof window.Notification === 'undefined') {
  window.Notification = function () {
    console.warn('Notification API not supported in this browser');
  };
  window.Notification.permission = 'denied';
  window.Notification.requestPermission = () => Promise.resolve('denied');
}

// Example: Add more API shims here if you run into similar issues.
// For instance:
// if (typeof window.fetch === 'undefined') {
//   import('whatwg-fetch');
// }

