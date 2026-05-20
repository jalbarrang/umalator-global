import { lazy } from 'react';

/** Lazy chart modules — import from here so recharts stays out of the main bundle. */
export const LazyActivationEffectChart = lazy(() =>
  import('./ActivationEffectChart').then((module) => ({
    default: module.ActivationEffectChart
  }))
);

export const LazyLengthDifferenceChart = lazy(() =>
  import('./LengthDifferenceChart').then((module) => ({
    default: module.LengthDifferenceChart
  }))
);

/** Reserved for upcoming activation frequency UI — use this export when wiring the feature. */
export const LazyActivationFrequencyChart = lazy(() =>
  import('./ActivationFrequencyChart').then((module) => ({
    default: module.ActivationFrequencyChart
  }))
);
