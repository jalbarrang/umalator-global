const multiplier = 2;
export const TICKS_PER_SECOND = 15 * multiplier;
export const SIM_TO_DISPLAY_SECONDS = 1.18 * multiplier;

export const RUNNER_COLORS = [
  '#e11d48',
  '#ea580c',
  '#ca8a04',
  '#65a30d',
  '#16a34a',
  '#0891b2',
  '#2563eb',
  '#7c3aed',
  '#db2777',
] as const;

export const PHASE_LABELS = ['Early-race', 'Mid-race', 'Late-race', 'Last Spurt'] as const;

// Colors sourced from the racetrack PhaseBar (phase-bar.tsx) at reduced opacity
// so they work as region backgrounds on both light and dark themes.
export const PHASE_COLORS = [
  { main: 'rgb(0, 154, 111)', accent: 'rgb(0, 92, 66)' },
  { main: 'rgb(242, 233, 103)', accent: 'rgb(190, 179, 16)' },
  { main: 'rgb(209, 134, 175)', accent: 'rgb(149, 56, 107)' },
  { main: 'rgb(199, 109, 159)', accent: 'rgb(133, 51, 96)' },
] as const;

export const PHASE_STYLES: ReadonlyArray<{ label: string; fill: string; stroke: string }> = [
  { label: PHASE_LABELS[0], fill: 'rgba(0, 154, 111, 0.15)', stroke: 'rgba(0, 92, 66, 0.40)' },
  { label: PHASE_LABELS[1], fill: 'rgba(242, 233, 103, 0.15)', stroke: 'rgba(190, 179, 16, 0.40)' },
  { label: PHASE_LABELS[2], fill: 'rgba(209, 134, 175, 0.15)', stroke: 'rgba(149, 56, 107, 0.40)' },
  { label: PHASE_LABELS[3], fill: 'rgba(199, 109, 159, 0.15)', stroke: 'rgba(133, 51, 96, 0.40)' },
];

export const TERRAIN_COLOR = 'rgb(211, 243, 68)';
export const TERRAIN_LINE_COLOR = 'rgb(140, 170, 10)';
