/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Feature Flags
  // Add new feature flags here with the VITE_FEATURE_ prefix
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
