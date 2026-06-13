import { defineConfig } from 'tsdown';

// Compile the deprecated engine as a monorepo library. The app consumes the
// package *source* (see `exports` in package.json), so this build exists to
// keep the library independently compilable / type-emitting.
//
// The engine has a circular dependency on the app's data layer (`@/*`) which
// is intentionally externalized — the deprecated package treats the app as a
// peer rather than re-bundling it.
export default defineConfig({
  entry: ['src/**/*.ts', '!src/**/*.test.ts'],
  outDir: 'dist',
  format: ['esm'],
  dts: true,
  unbundle: true,
  clean: true,
  external: [/^@\//]
});
