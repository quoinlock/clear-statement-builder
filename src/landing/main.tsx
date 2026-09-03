import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Landing } from './Landing.tsx';
// Montserrat is vendored (fontsource) so the CSP font-src 'self' rule holds.
import '@fontsource-variable/montserrat';
import './landing.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Landing />
  </StrictMode>,
);
