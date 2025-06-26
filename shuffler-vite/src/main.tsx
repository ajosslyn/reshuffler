import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './global.css'  // Add this global CSS import

// Suppress Spotify analytics errors
if (console && console.error) {
  const originalConsoleError = console.error;
  console.error = function(...args: any[]) {
    if (args[0] && typeof args[0] === 'string' && 
        args[0].includes('cpapi.spotify.com')) {
      // Suppress Spotify analytics errors
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
