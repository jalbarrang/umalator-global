import { TargetIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { bannerPickupTargets } from '@/modules/carat/data/card-names';
import type { BannerPlanRow } from '@/modules/carat/model/plan';
import { PITY_PULLS, targetGoalsOdds } from '@/modules/carat/model/odds';
import { setCopyGoal, setOwnedCopies } from '@/store/carat.store';
import { cn } from '@/lib/utils';

type TargetGoalsProps = {
  row: BannerPlanRow;
  className?: string;
};

// Copy goal options. 1 copy = LB0 (base), 5 copies = MLB, matching the
// CopiesOddsBar tier labels.
const GOAL_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Skip' },
  { value: 1, label: '1 (LB0)' },
  { value: 2, label: '2 (LB1)' },
  { value: 3, label: '3 (LB2)' },
  { value: 4, label: '4 (LB3)' },
  { value: 5, label: '5 (MLB)' }
];

// Copies already owned (reruns). Capped at 4 — owning MLB leaves nothing to pull.
const OWNED_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 1, label: '1 (LB0)' },
  { value: 2, label: '2 (LB1)' },
  { value: 3, label: '3 (LB2)' },
  { value: 4, label: '4 (LB3)' }
];

const GOAL_SHORT: Record<number, string> = {
  1: 'LB0',
  2: 'LB1',
  3: 'LB2',
  4: 'LB3',
  5: 'MLB'
};

function shortName(name: string) {
  return name.split(']').pop()?.trim() || name;
}

function formatPercent(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits }).format(
    value
  );
}

export function TargetGoals(props: TargetGoalsProps) {
  const { row, className } = props;
  const targets = bannerPickupTargets(row.event);
  if (targets.length < 2) return null;

  const goals = row.plannedBanner.copyGoals ?? {};
  const owned = row.plannedBanner.ownedCopies ?? {};
  const pulls = row.plannedBanner.plannedPulls;

  // Each active goal contributes the copies the banner still needs to supply:
  // total goal minus copies already owned.
  const activeGoals = targets
    .map((target) => {
      const goal = goals[target.id] ?? 0;
      const have = Math.min(owned[target.id] ?? 0, Math.max(0, goal));
      return { target, goal, have, needed: Math.max(0, goal - have) };
    })
    .filter((entry) => entry.goal >= 1);
  const hasGoals = activeGoals.length > 0;

  const chance = hasGoals
    ? targetGoalsOdds({ pulls, goals: activeGoals.map((entry) => entry.needed) })
    : null;
  const sparks = Math.floor(pulls / PITY_PULLS);
  const neededSparks = activeGoals.reduce((total, entry) => total + entry.needed, 0);

  return (
    <div className={cn('space-y-1.5', className)}>
      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" size="xs" className="gap-1.5">
              <TargetIcon />
              {hasGoals ? `Goals · ${activeGoals.length}` : 'Set goals'}
            </Button>
          }
        />
        <PopoverContent align="start" className="w-96">
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium text-muted-foreground">
            <span className="flex-1">Card</span>
            <span className="w-24 text-center">Own</span>
            <span className="w-24 text-center">Goal</span>
          </div>
          <div className="space-y-1.5">
            {targets.map((target) => {
              const goalValue = goals[target.id] ?? 0;
              const ownValue = owned[target.id] ?? 0;
              return (
                <div key={target.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-xs" title={target.name}>
                    {target.name}
                  </span>
                  <Select
                    value={String(ownValue)}
                    onValueChange={(next) =>
                      next != null && setOwnedCopies(row.event.id, target.id, Number(next))
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`Copies already owned of ${target.name}`}
                      className="h-7 w-24 shrink-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OWNED_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(goalValue)}
                    onValueChange={(next) =>
                      next != null && setCopyGoal(row.event.id, target.id, Number(next))
                    }
                  >
                    <SelectTrigger
                      size="sm"
                      aria-label={`Copy goal for ${target.name}`}
                      className="h-7 w-24 shrink-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GOAL_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Own = copies you already have (reruns). Each {PITY_PULLS}-pull spark guarantees one copy
            of one card, allocated to your hardest goals first.
          </p>
        </PopoverContent>
      </Popover>

      {hasGoals && chance != null ? (
        <div className="space-y-0.5 text-[11px] leading-snug text-muted-foreground">
          <div>
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatPercent(chance)}
            </span>{' '}
            to reach{' '}
            {activeGoals
              .map((entry) => `${GOAL_SHORT[entry.goal]} ${shortName(entry.target.name)}`)
              .join(' + ')}
            .
          </div>
          <div>
            Banner must supply {neededSparks} cop{neededSparks === 1 ? 'y' : 'ies'} worst-case;{' '}
            {sparks} spark{sparks === 1 ? '' : 's'} at {pulls} pulls.
          </div>
        </div>
      ) : null}
    </div>
  );
}
