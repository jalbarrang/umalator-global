/// <reference types="vite/client" />

declare const __APP__VERSION__: string;

interface ImportMetaEnv {
  // Feature Flags
  // Add new feature flags here with the VITE_FEATURE_ prefix
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
