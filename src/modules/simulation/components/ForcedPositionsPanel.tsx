import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from '@/components/ui/panel';
import i18n from '@/i18n';
import { useRunnersStore } from '@/store/runners.store';
import {
  clearAllForcedPositions,
  clearForcedPosition,
  setForcedPosition,
  useForcedPositions,
  type CompareRunnerId,
} from '@/modules/simulation/stores/forced-positions.store';

type RunnerSkillEntry = {
  skillId: string;
  normalizedSkillId: string;
  name: string;
};

function buildRunnerSkillEntries(skills: Array<string>): Array<RunnerSkillEntry> {
  return skills.map((skillId) => {
    const normalizedSkillId = skillId.split('-')[0];

    return {
      skillId,
      normalizedSkillId,
      name: i18n.t(`skillnames.${normalizedSkillId}`),
    };
  });
}

function updateForcedPosition(runnerId: CompareRunnerId, skillId: string, rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (trimmedValue === '') {
    clearForcedPosition(runnerId, skillId);
    return;
  }

  const parsed = Number(trimmedValue);

  if (!Number.isFinite(parsed) || parsed < 0) {
    clearForcedPosition(runnerId, skillId);
    return;
  }

  setForcedPosition(runnerId, skillId, Math.round(parsed));
}

function RunnerForcePositionGroup({
  runnerId,
  title,
  skills,
  positions,
}: {
  runnerId: CompareRunnerId;
  title: string;
  skills: Array<RunnerSkillEntry>;
  positions: Record<string, number>;
}) {
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
            <div
              key={`${runnerId}-${skill.skillId}`}
              className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-2"
            >
              <div className="truncate text-sm" title={skill.name}>
                {skill.name}
              </div>

              <Input
                type="number"
                min={0}
                step={10}
                placeholder="Auto"
                value={positions[skill.normalizedSkillId]?.toString() ?? ''}
                onChange={(event) =>
                  updateForcedPosition(runnerId, skill.normalizedSkillId, event.currentTarget.value)
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ForcedPositionsPanel() {
  const { uma1Skills, uma2Skills } = useRunnersStore(
    useShallow((state) => ({
      uma1Skills: state.uma1.skills,
      uma2Skills: state.uma2.skills,
    })),
  );
  const { uma1, uma2 } = useForcedPositions();

  const mappedSkills = useMemo(() => {
    return {
      uma1: buildRunnerSkillEntries(uma1Skills),
      uma2: buildRunnerSkillEntries(uma2Skills),
    };
  }, [uma1Skills, uma2Skills]);

  return (
    <Panel>
      <PanelHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <PanelTitle>Forced Skill Positions</PanelTitle>
            <PanelDescription>Override skill activation positions here.</PanelDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllForcedPositions}
            disabled={Object.keys(uma1).length === 0 && Object.keys(uma2).length === 0}
          >
            Clear all
          </Button>
        </div>
      </PanelHeader>

      <PanelContent className="flex flex-col gap-3">
        <RunnerForcePositionGroup
          runnerId="uma1"
          title="Uma 1"
          skills={mappedSkills.uma1}
          positions={uma1}
        />
        <RunnerForcePositionGroup
          runnerId="uma2"
          title="Uma 2"
          skills={mappedSkills.uma2}
          positions={uma2}
        />
      </PanelContent>
    </Panel>
  );
}
