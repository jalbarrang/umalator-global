/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Feature Flags
  // Add new feature flags here with the VITE_FEATURE_ prefix
  readonly VITE_FEATURE_SKILL_PLANNER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
