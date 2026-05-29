import { envString, envBoolean } from './env';

export type AppConfig = {
  basePath: string;
  reactScan: boolean;
  enableGrab: boolean;
  posthog: {
    key?: string;
    host?: string;
  };
};

export const config: AppConfig = {
  basePath: envString('VITE_BASE_PATH', '/'),
  reactScan: envBoolean('VITE_REACT_SCAN', false),
  enableGrab: envBoolean('VITE_ENABLE_GRAB', false),
  posthog: {
    key: envString('VITE_PUBLIC_POSTHOG_KEY'),
    host: envString('VITE_PUBLIC_POSTHOG_HOST')
  }
};
