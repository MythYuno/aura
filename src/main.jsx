import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ErrorBoundary } from './components/ErrorBoundary.jsx';
import { registerSW } from './lib/sw.js';
import './styles/globals.css';

// When a new version of the app is available, dispatch an event the UI can
// pick up to show a small "ricarica" toast.
registerSW((apply) => {
  window.dispatchEvent(new CustomEvent('aura:update', { detail: { apply } }));
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
