import { AptitudeSelect } from '@/modules/runners/components/AptitudeSelect';
import { Label } from '@/components/ui/label';
import type { RunnerAptitudes } from '@/modules/runners/components/runner-card/types';
import {
  DISTANCE_BUCKETS,
  STYLE_BUCKETS,
  SURFACE_BUCKETS,
  type AptitudeBucketKey
} from '@/modules/race-sim/aptitude-buckets';

type BucketAptitudesEditorProps = {
  value: RunnerAptitudes;
  onChange: (key: AptitudeBucketKey, grade: string) => void;
};

function BucketGroup({
  title,
  buckets,
  value,
  onChange
}: {
  title: string;
  buckets: ReadonlyArray<{ key: AptitudeBucketKey; label: string }>;
  value: RunnerAptitudes;
  onChange: (key: AptitudeBucketKey, grade: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {buckets.map((bucket) => (
          <div key={bucket.key} className="flex items-center gap-2 rounded-xl border">
            <Label className="w-14 pl-2 text-xs">{bucket.label}</Label>
            <AptitudeSelect
              value={value[bucket.key]}
              onChange={(grade) => onChange(bucket.key, grade)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function BucketAptitudesEditor({ value, onChange }: BucketAptitudesEditorProps) {
  return (
    <div className="space-y-3">
      <BucketGroup title="Distance" buckets={DISTANCE_BUCKETS} value={value} onChange={onChange} />
      <BucketGroup title="Surface" buckets={SURFACE_BUCKETS} value={value} onChange={onChange} />
      <BucketGroup title="Style" buckets={STYLE_BUCKETS} value={value} onChange={onChange} />
    </div>
  );
}
