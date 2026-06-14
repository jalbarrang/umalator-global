import { AptitudeSelect } from '@/modules/runners/components/AptitudeSelect';
import {
  DISTANCE_BUCKETS,
  STYLE_BUCKETS,
  SURFACE_BUCKETS,
  type AptitudeBucketKey
} from '@/modules/race-sim/aptitude-buckets';
import type { RunnerAptitudes } from '@/modules/runners/components/runner-card/types';

type BucketAptitudesEditorProps = {
  value: RunnerAptitudes;
  onChange: (key: AptitudeBucketKey, grade: string) => void;
};

// One shared 5-column template (label + 4 buckets) so every row aligns.
const ROW_GRID = 'grid grid-cols-[4rem_repeat(4,minmax(0,1fr))] items-center gap-2';

function BucketRow({
  label,
  buckets,
  value,
  onChange
}: {
  label: string;
  buckets: ReadonlyArray<{ key: AptitudeBucketKey; label: string }>;
  value: RunnerAptitudes;
  onChange: (key: AptitudeBucketKey, grade: string) => void;
}) {
  return (
    <div className={ROW_GRID}>
      <span className="text-right text-xs font-medium text-muted-foreground">{label}</span>
      {buckets.map((bucket) => (
        <div
          key={bucket.key}
          className="flex items-center justify-between rounded-full border bg-card pl-3 pr-1 py-0.5"
        >
          <span className="text-xs text-muted-foreground">{bucket.label}</span>
          <AptitudeSelect
            value={value[bucket.key]}
            onChange={(grade) => onChange(bucket.key, grade)}
            className="w-auto px-1"
          />
        </div>
      ))}
    </div>
  );
}

export function BucketAptitudesEditor({ value, onChange }: BucketAptitudesEditorProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <BucketRow label="Track" buckets={SURFACE_BUCKETS} value={value} onChange={onChange} />
      <BucketRow label="Distance" buckets={DISTANCE_BUCKETS} value={value} onChange={onChange} />
      <BucketRow label="Style" buckets={STYLE_BUCKETS} value={value} onChange={onChange} />
    </div>
  );
}
