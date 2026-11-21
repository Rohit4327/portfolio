import { createRoot } from 'react-dom/client';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import './ui/styles.css';
import { App } from './App';
import { installApi } from './debug/api';
import { DEBUG } from './state/store';

// @react-three/fiber 9 still constructs THREE.Clock, which three r183+ reports as deprecated on every load.
// It is a third-party notice with no effect on the app, so that one message is dropped (DECISIONS D-12).
const warn = console.warn.bind(console);
console.warn = (...a: unknown[]) => {
  if (typeof a[0] === 'string' && a[0].includes('THREE.Clock: This module has been deprecated')) return;
  warn(...a);
};

// window.__studio is available in dev and with ?debug=… (22B.1).
if (import.meta.env.DEV || DEBUG) installApi();
createRoot(document.getElementById('root')!).render(<App />);
