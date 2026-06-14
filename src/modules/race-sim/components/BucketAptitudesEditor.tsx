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
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-right text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">
        {buckets.map((bucket) => (
          <div
            key={bucket.key}
            className="flex items-center gap-1 rounded-full border bg-card pl-3 pr-1 py-0.5"
          >
            <span className="text-xs text-muted-foreground">{bucket.label}</span>
            <AptitudeSelect
              value={value[bucket.key]}
              onChange={(grade) => onChange(bucket.key, grade)}
              className="w-auto px-1.5"
            />
          </div>
        ))}
      </div>
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
