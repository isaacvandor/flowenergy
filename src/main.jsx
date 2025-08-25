// Load polyfills first for mobile Safari compatibility
import './polyfills.js'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Expose React globally for debugging
window.React = React;
window.ReactDOM = ReactDOM;

// Mobile-safe React mounting
function mountReactApp() {
  try {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      console.log('Root element found, mounting React...');
      
      const appComponent = <App />;
      
      console.log('Using React 18 createRoot');
      // Mobile Safari compatibility: ensure createRoot is accessible
      const createRootFn = ReactDOM.createRoot || window.ReactDOM?.createRoot || window.ReactDOM?.default?.createRoot;
      
      if (typeof createRootFn !== 'function') {
        console.error('createRoot not found. ReactDOM structure:', ReactDOM);
        console.error('window.ReactDOM structure:', window.ReactDOM);
        throw new Error('React 18 createRoot method not accessible - possible mobile Safari module resolution issue');
      }
      
      // Use React 18 createRoot
      const root = createRootFn(rootElement);
      root.render(appComponent);
      
      console.log('React mounted successfully');
      
      // Hide fallback loading screen when React mounts
      setTimeout(() => {
        const fallback = document.getElementById('mobile-fallback');
        if (fallback) {
          console.log('Hiding mobile fallback');
          fallback.style.display = 'none';
        }
      }, 100);
    } else {
      console.error('Root element not found - DOM may not be ready');
      // Try again after a short delay
      setTimeout(mountReactApp, 100);
    }
  } catch (error) {
    console.error('Failed to mount React app:', error);
    // Show error message with details
    const errorEl = document.getElementById('error-message');
    const errorDetails = document.getElementById('error-details');
    if (errorEl && errorDetails) {
      errorEl.style.display = 'block';
      errorDetails.innerHTML = `
        <strong>React Mount Error:</strong><br>
        ${error.message}<br>
        <small>Check browser console for more details</small>
      `;
    }
  }
}

// Ensure DOM is ready before mounting
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountReactApp);
} else {
  mountReactApp();
}
