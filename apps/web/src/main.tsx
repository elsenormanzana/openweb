import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!;
// Always use createRoot — SSR output is for SEO crawlers, not React hydration.
// React will replace server-rendered content with its own tree on mount.
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

