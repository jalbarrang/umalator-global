import { useCallback, type ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import i18n from '@/i18n';
import { normalizeSkillId } from '@/modules/data/skills';
import {
  SkillItem,
  SkillItemAccessory,
  SkillItemBody,
  SkillItemIdentity,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
} from '@/modules/skills/components/skill-list/skill-item';
import {
  clearForcedPosition,
  setForcedPosition,
  type CompareRunnerId,
} from '@/modules/simulation/stores/forced-positions.store';

type RunnerSkillEntry = {
  skillId: string;
  normalizedSkillId: string;
};

function parseForcedPosition(rawValue: string): number | null {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === '') {
    return null;
  }

  const parsed = Number(trimmedValue);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.round(parsed);
}

function ForcedPositionRow({
  runnerId,
  skill,
  positions,
}: Readonly<{
  runnerId: CompareRunnerId;
  skill: RunnerSkillEntry;
  positions: Record<string, number>;
}>) {
  const handlePositionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextPosition = parseForcedPosition(event.currentTarget.value);

      if (nextPosition == null) {
        clearForcedPosition(runnerId, skill.normalizedSkillId);
        return;
      }

      setForcedPosition(runnerId, skill.normalizedSkillId, nextPosition);
    },
    [runnerId, skill.normalizedSkillId],
  );

  return (
    <SkillItem key={`${runnerId}-${skill.skillId}`} skillId={skill.skillId} runnerId={runnerId}>
      <SkillItemRoot interactive={false}>
        <SkillItemRail />
        <SkillItemBody className="p-1 px-2">
          <SkillItemMain>
            <SkillItemIdentity />
            <SkillItemAccessory className="w-[112px]">
              <Input
                type="number"
                min={0}
                step={10}
                placeholder="Auto"
                aria-label={`${i18n.t(`skillnames.${normalizeSkillId(skill.skillId)}`)} forced position`}
                value={positions[skill.normalizedSkillId]?.toString() ?? ''}
                onChange={handlePositionChange}
              />
            </SkillItemAccessory>
          </SkillItemMain>
        </SkillItemBody>
      </SkillItemRoot>
    </SkillItem>
  );
}

type ForcedPositionGroupProps = Readonly<{
  runnerId: CompareRunnerId;
  title: string;
  skills: Array<RunnerSkillEntry>;
  positions: Record<string, number>;
}>;

export function buildRunnerSkillEntries(skills: Array<string>): Array<RunnerSkillEntry> {
  return skills.map((skillId) => ({
    skillId,
    normalizedSkillId: normalizeSkillId(skillId),
  }));
}

export function ForcedPositionGroup({
  runnerId,
  title,
  skills,
  positions,
}: ForcedPositionGroupProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-3">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Label>

      {skills.length === 0 && (
        <div className="text-xs text-muted-foreground">This runner has no skills.</div>
      )}

      {skills.length > 0 && (
        <div className="flex flex-col gap-2">
          {skills.map((skill) => (
            <ForcedPositionRow
              key={`${runnerId}-${skill.skillId}`}
              runnerId={runnerId}
              skill={skill}
              positions={positions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
