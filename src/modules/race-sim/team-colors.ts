/**
 * Fixed palette for CM/LoH team grouping. Keyed by 1-based team number.
 * Returns Tailwind classes for a small chip/dot plus a display label.
 */
type TeamStyle = {
  label: string;
  chipClass: string;
  dotClass: string;
};

const TEAM_STYLES: Record<number, TeamStyle> = {
  1: { label: 'Team 1', chipClass: 'bg-sky-500/15 text-sky-500', dotClass: 'bg-sky-500' },
  2: { label: 'Team 2', chipClass: 'bg-rose-500/15 text-rose-500', dotClass: 'bg-rose-500' },
  3: { label: 'Team 3', chipClass: 'bg-amber-500/15 text-amber-500', dotClass: 'bg-amber-500' },
  4: {
    label: 'Team 4',
    chipClass: 'bg-emerald-500/15 text-emerald-500',
    dotClass: 'bg-emerald-500'
  },
  5: {
    label: 'Team 5',
    chipClass: 'bg-violet-500/15 text-violet-500',
    dotClass: 'bg-violet-500'
  },
  6: { label: 'Team 6', chipClass: 'bg-cyan-500/15 text-cyan-500', dotClass: 'bg-cyan-500' }
};

const FALLBACK_STYLE: TeamStyle = {
  label: 'Team',
  chipClass: 'bg-muted text-muted-foreground',
  dotClass: 'bg-muted-foreground'
};

export function getTeamStyle(team: number): TeamStyle {
  return TEAM_STYLES[team] ?? { ...FALLBACK_STYLE, label: `Team ${team}` };
}
