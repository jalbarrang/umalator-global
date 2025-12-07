import 'intl-pluralrules';

import './styles.css';
import './app.css';

import { createRoot } from 'react-dom/client';
import { PostHogProvider } from 'posthog-js/react';
import './i18n';

import { App } from './App';
import { Toaster } from './components/ui/sonner';
import { StrictMode } from 'react';
import { BrowserRouter } from 'react-router';

const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;
const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;

const options = {
  api_host: posthogHost,
  defaults: '2025-11-30',
} as const;

const container = document.getElementById('app');
const root = createRoot(container!);

root.render(
  <StrictMode>
    <BrowserRouter>
      {posthogKey && (
        <PostHogProvider apiKey={posthogKey} options={options}>
          <App />
          <Toaster />
        </PostHogProvider>
      )}

      {!posthogKey && (
        <>
          <App />
          <Toaster />
        </>
      )}
    </BrowserRouter>
  </StrictMode>,
);
