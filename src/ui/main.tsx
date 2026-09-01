import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.tsx';
// Montserrat is vendored (fontsource) so the CSP font-src 'self' rule holds.
import '@fontsource-variable/montserrat';
import './theme.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
