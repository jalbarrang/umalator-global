import { envString, envBoolean } from './env';

export type AppConfig = {
  baseUrl: string;
  reactScan: boolean;
  posthog: {
    key?: string;
    host?: string;
  };
};

export const config: AppConfig = {
  baseUrl: envString('VITE_BASE_URL', 'http://localhost:5173'),
  reactScan: envBoolean('VITE_REACT_SCAN', false),
  posthog: {
    key: envString('VITE_PUBLIC_POSTHOG_KEY'),
    host: envString('VITE_PUBLIC_POSTHOG_HOST'),
  },
};
