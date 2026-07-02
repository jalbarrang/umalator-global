import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import { StrategySelect } from './StrategySelect';
import { MoodSelect } from './MoodSelect';
import { BucketAptitudesEditor } from './BucketAptitudesEditor';
import type { IRunnerState } from './runner-card/types';
import type { IMood } from '@/lib/uma-domain/runner/definitions';
import {
  bucketsFromRunner,
  collapsedFromBuckets,
  type AptitudeBucketKey
} from '@/modules/runners/aptitude-buckets';

type AptitudeBucketsFieldProps = {
  value: IRunnerState;
  onChange: (next: IRunnerState) => void;
  /** When set, collapsed grades resolve to this course; else best-grade max. */
  courseId?: number;
  /** Veteran/library editors hide strategy + mood (not race-specific). */
  showStrategyMood?: boolean;
  hasRunawaySkill?: boolean;
  onRunawayStrategy?: () => void;
};

export function AptitudeBucketsField({
  value,
  onChange,
  courseId,
  showStrategyMood = true,
  hasRunawaySkill = false,
  onRunawayStrategy
}: AptitudeBucketsFieldProps) {
  const handleBucketChange = useCallback(
    (key: AptitudeBucketKey, grade: string) => {
      const aptitudes = { ...bucketsFromRunner(value), [key]: grade };
      const collapsed = collapsedFromBuckets(aptitudes, value.strategy, courseId);
      onChange({ ...value, aptitudes, ...collapsed });
    },
    [onChange, value, courseId]
  );

  const handleStrategy = useCallback(
    (strategy: string | null) => {
      if (!strategy) return;
      const next = { ...value, strategy } as IRunnerState;
      if (value.aptitudes) {
        Object.assign(next, collapsedFromBuckets(value.aptitudes, next.strategy, courseId));
      }
      onChange(next);
      if (strategy === 'Runaway') onRunawayStrategy?.();
    },
    [onChange, value, courseId, onRunawayStrategy]
  );

  const handleMood = useCallback(
    (mood: IMood) => {
      onChange({ ...value, mood });
    },
    [onChange, value]
  );

  return (
    <div className="flex flex-col gap-3">
      <BucketAptitudesEditor value={bucketsFromRunner(value)} onChange={handleBucketChange} />

      {showStrategyMood && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border">
            <Label className="w-16 pl-2 text-xs">Style:</Label>
            <StrategySelect
              value={value.strategy}
              onChange={handleStrategy}
              disabled={hasRunawaySkill}
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border">
            <Label className="w-16 pl-2 text-xs">Mood:</Label>
            <MoodSelect value={value.mood} onChange={handleMood} />
          </div>
        </div>
      )}
    </div>
  );
}
