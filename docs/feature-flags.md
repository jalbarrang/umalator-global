# Feature Flags

A type-safe, environment-variable-based feature flag system for controlling feature rollouts in the Umalator application.

## Overview

Feature flags allow you to:
- Enable/disable features without code changes
- Test features in development before production release
- Gradually roll out features across different environments
- Quickly disable problematic features

## Architecture

The feature flag system uses Vite's built-in environment variable support (`import.meta.env`). Flags are:
- **Build-time**: Baked into the bundle during build
- **Type-safe**: Full TypeScript support with autocomplete
- **Zero runtime overhead**: Dead code elimination for disabled features

## Quick Start

### 1. Define a New Feature Flag

Add your flag to three places:

**a) Update TypeScript definitions** (`src/vite-env.d.ts`):
```typescript
interface ImportMetaEnv {
  // ... existing flags
  readonly VITE_FEATURE_MY_NEW_FEATURE?: string;
}
```

**b) Add to FeatureFlags constant** (`src/lib/feature-flags.ts`):
```typescript
export const FeatureFlags = {
  // ... existing flags
  MY_NEW_FEATURE: 'VITE_FEATURE_MY_NEW_FEATURE',
} as const;
```

**c) Set default values in environment files**:

`.env.development`:
```bash
VITE_FEATURE_MY_NEW_FEATURE=true
```

`.env.production`:
```bash
VITE_FEATURE_MY_NEW_FEATURE=false
```

`.env.example`:
```bash
# Description of what this feature does
# VITE_FEATURE_MY_NEW_FEATURE=false
```

### 2. Use the Feature Flag

**In React Components** (using hook):
```tsx
import { useFeature } from '@/lib/feature-flags';

function MyComponent() {
  const isEnabled = useFeature('MY_NEW_FEATURE');

  return isEnabled ? <NewFeature /> : <OldFeature />;
}
```

**In React Components** (using wrapper):
```tsx
import { FeatureFlag } from '@/lib/feature-flags';

function MyComponent() {
  return (
    <FeatureFlag feature="MY_NEW_FEATURE" fallback={<OldFeature />}>
      <NewFeature />
    </FeatureFlag>
  );
}
```

**In Workers/Utilities** (non-React):
```typescript
import { isFeatureEnabled } from '@/lib/feature-flags';

export function processData() {
  if (isFeatureEnabled('MY_NEW_FEATURE')) {
    return newAlgorithm();
  }
  return legacyAlgorithm();
}
```

## Environment Files

### File Priority

Vite loads environment files in this order (later files override earlier ones):

1. `.env` - Shared defaults for all environments
2. `.env.local` - Local overrides (gitignored, for personal testing)
3. `.env.[mode]` - Mode-specific (`.env.development`, `.env.production`)
4. `.env.[mode].local` - Mode-specific local overrides (gitignored)

### File Usage

- **`.env.example`**: Template showing all available flags (committed to git)
- **`.env.development`**: Development defaults (committed to git)
- **`.env.production`**: Production defaults (committed to git)
- **`.env.local`**: Personal overrides for local testing (gitignored, create manually)

## Naming Conventions

### Environment Variable Names

- **Prefix**: All feature flags MUST start with `VITE_FEATURE_`
- **Format**: `VITE_FEATURE_<DESCRIPTIVE_NAME>`
- **Case**: UPPER_SNAKE_CASE
- **Values**: String `"true"` or `"false"`

Examples:
- ✅ `VITE_FEATURE_NEW_DASHBOARD=true`
- ✅ `VITE_FEATURE_OPTIMIZED_ALGORITHM=false`
- ❌ `FEATURE_NEW_UI=true` (missing VITE_ prefix)
- ❌ `VITE_NEW_FEATURE=true` (missing FEATURE_ infix)

### TypeScript Key Names

- **Format**: PascalCase without prefix
- **Example**: `NEW_DASHBOARD` (not `VITE_FEATURE_NEW_DASHBOARD`)

## Testing Locally

### Override a Flag for Local Development

1. Create `.env.local` (if it doesn't exist)
2. Add your override:
   ```bash
   VITE_FEATURE_MY_NEW_FEATURE=true
   ```
3. Restart the dev server (`bun run dev`)

### View All Active Flags

In development mode, you can log all flags:

```typescript
import { logFeatureFlags } from '@/lib/feature-flags';

// In your component or app initialization
logFeatureFlags();
```

This outputs:
```
🚩 Feature Flags
  NEW_DASHBOARD: ✅ enabled
  OPTIMIZED_ALGORITHM: ❌ disabled
  EXPERIMENTAL_CHARTS: ✅ enabled
```

### Get All Flags Programmatically

```typescript
import { getAllFeatureFlags } from '@/lib/feature-flags';

const flags = getAllFeatureFlags();
console.log(flags);
// { NEW_DASHBOARD: true, OPTIMIZED_ALGORITHM: false, ... }
```

## Best Practices

### When to Use Feature Flags

✅ **Good use cases:**
- New features in development/testing
- Gradual rollouts to production
- A/B testing different implementations
- Emergency kill switches for problematic features
- Environment-specific behaviors

❌ **Avoid for:**
- Permanent configuration (use regular config instead)
- User preferences (use settings/localStorage)
- Runtime toggles (feature flags are build-time only)

### Flag Lifecycle

1. **Create**: Add flag, implement feature behind it
2. **Test**: Enable in development, test thoroughly
3. **Release**: Enable in production when ready
4. **Cleanup**: Remove flag after feature is stable (usually 1-2 releases)

### Cleanup Old Flags

Feature flags should be temporary. After a feature is fully rolled out and stable:

1. Remove the flag check from code
2. Remove from `FeatureFlags` constant
3. Remove from `ImportMetaEnv` interface
4. Remove from all `.env` files
5. Keep the feature code (now always enabled)

### Multiple Environments

For staging/preview environments, create:
- `.env.staging` for staging-specific flags
- `.env.preview` for preview-specific flags

Then build with: `vite build --mode staging`

## Troubleshooting

### Flag not working after change

**Problem**: Changed `.env` file but flag still has old value

**Solution**: Restart the dev server. Vite only reads `.env` files on startup.

### Flag undefined in TypeScript

**Problem**: TypeScript shows flag as `undefined`

**Solution**:
1. Check you added it to `ImportMetaEnv` interface in `src/vite-env.d.ts`
2. Restart TypeScript server in your IDE

### Flag not accessible in code

**Problem**: `import.meta.env.VITE_FEATURE_X` is undefined

**Solution**:
1. Ensure flag name starts with `VITE_FEATURE_`
2. Check the flag exists in your `.env` file
3. Restart dev server

### Production build has wrong flag value

**Problem**: Production build doesn't respect `.env.production`

**Solution**: Ensure you're running `bun run build` (uses production mode by default). Check that `.env.production` exists and has correct values.

## Advanced Usage

### Conditional Imports

Since flags are build-time, you can use dynamic imports for code splitting:

```typescript
if (isFeatureEnabled('EXPERIMENTAL_CHARTS')) {
  const { AdvancedChart } = await import('./AdvancedChart');
  // Use AdvancedChart
}
```

When the flag is disabled, the `AdvancedChart` module won't be included in the bundle.

### Type Guards

Create type-safe feature checks:

```typescript
function isNewDashboardEnabled(): boolean {
  return isFeatureEnabled('NEW_DASHBOARD');
}

// Use in code
if (isNewDashboardEnabled()) {
  // TypeScript knows this is the new dashboard branch
}
```

## API Reference

### `isFeatureEnabled(flag: FeatureFlagKey): boolean`

Check if a feature flag is enabled. Works in any context (React, workers, utilities).

### `useFeature(flag: FeatureFlagKey): boolean`

React hook to check if a feature flag is enabled. Memoized for performance.

### `FeatureFlag`

React component for conditional rendering based on feature flags.

**Props:**
- `feature: FeatureFlagKey` - The feature flag to check
- `children: React.ReactNode` - Content to render when enabled
- `fallback?: React.ReactNode` - Content to render when disabled (default: null)

### `getAllFeatureFlags(): Record<FeatureFlagKey, boolean>`

Get all feature flags and their current states. Useful for debugging.

### `logFeatureFlags(): void`

Development helper to log all feature flags to console. Only works in dev mode.

## Examples

### Example 1: Gradual Feature Rollout

```typescript
// Development: Test new algorithm
// .env.development
VITE_FEATURE_OPTIMIZED_ALGORITHM=true

// Production: Keep old algorithm for now
// .env.production
VITE_FEATURE_OPTIMIZED_ALGORITHM=false

// Code
import { isFeatureEnabled } from '@/lib/feature-flags';

export function runSimulation() {
  if (isFeatureEnabled('OPTIMIZED_ALGORITHM')) {
    return optimizedSimulation();
  }
  return standardSimulation();
}
```

### Example 2: UI Feature Toggle

```tsx
import { FeatureFlag } from '@/lib/feature-flags';

function Dashboard() {
  return (
    <div>
      <FeatureFlag feature="NEW_DASHBOARD">
        <NewDashboardLayout />
      </FeatureFlag>

      <FeatureFlag feature="NEW_DASHBOARD" fallback={<OldCharts />}>
        <NewCharts />
      </FeatureFlag>
    </div>
  );
}
```

### Example 3: Development-Only Features

```typescript
// .env.development
VITE_FEATURE_DEBUG_PANEL=true

// .env.production
VITE_FEATURE_DEBUG_PANEL=false

// Component
import { useFeature } from '@/lib/feature-flags';

function App() {
  const showDebug = useFeature('DEBUG_PANEL');

  return (
    <div>
      <MainApp />
      {showDebug && <DebugPanel />}
    </div>
  );
}
```

## Related Documentation

- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Contributing Guide](../CONTRIBUTING.md)
- [Project Structure](../README.md)

