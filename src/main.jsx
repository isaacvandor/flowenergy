// Load polyfills first for mobile Safari compatibility
import './polyfills.js'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Expose React globally for debugging
window.React = React;
window.ReactDOM = ReactDOM;

// Detect mobile Safari (known to have issues with React 18 createRoot)
function isMobileSafari() {
  const userAgent = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(userAgent) && /Safari/.test(userAgent) && !/Chrome|CriOS|FxiOS/.test(userAgent);
}

// Mobile-safe React mounting with Safari compatibility
function mountReactApp() {
  try {
    const rootElement = document.getElementById('root');
    if (rootElement) {
      console.log('Root element found, mounting React...');
      
      const appComponent = <App />;
      
      if (isMobileSafari()) {
        console.log('Mobile Safari detected, using legacy render method');
        // Use React 17 legacy render for mobile Safari compatibility
        ReactDOM.render(appComponent, rootElement);
      } else {
        console.log('Using React 18 createRoot');
        // Use React 18 createRoot for other browsers
        const root = ReactDOM.createRoot(rootElement);
        root.render(appComponent);
      }
      
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
