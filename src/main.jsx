import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Mobile-safe React mounting
try {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    
    // Hide fallback loading screen when React mounts
    setTimeout(() => {
      const fallback = document.getElementById('mobile-fallback');
      if (fallback) {
        fallback.style.display = 'none';
      }
    }, 100);
  } else {
    console.error('Root element not found');
  }
} catch (error) {
  console.error('Failed to mount React app:', error);
  // Show error message
  const errorEl = document.getElementById('error-message');
  if (errorEl) {
    errorEl.style.display = 'block';
    errorEl.textContent = 'Failed to start app: ' + error.message;
  }
}
