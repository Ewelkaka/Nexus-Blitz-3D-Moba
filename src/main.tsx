import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress external extension errors
window.addEventListener('error', (event) => {
  if (event.message.includes('destroyTonkeeper')) {
    event.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && typeof event.reason === 'string' && event.reason.includes('destroyTonkeeper')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
