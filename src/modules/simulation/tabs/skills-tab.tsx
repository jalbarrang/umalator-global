import { useMemo } from 'react';

import { ChevronsUpDown, Zap } from 'lucide-react';
import type { ISkillTarget, ISkillType } from 'sunday-tools/skills/definitions';
import { useRaceStore } from '@/modules/simulation/stores/compare.store';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty';
import { getSkillNameById } from '@/modules/skills/utils';
import {
  SkillType,
  translateSkillEffectTarget,
  translateSkillEffectType
} from 'sunday-tools/skills/definitions';

/**
 * Returns skill activates grouped by skill id
 */
const useRunnerSkillsActivated = (runnerIndex: number) => {
  const { chartData } = useRaceStore();

  return useMemo(() => {
    if (!chartData) return [];

    const runnerSkills = chartData.skillActivations[runnerIndex];

    const skillPositions: Array<SkillPosition> = [];
    for (const [skillId, activations] of Object.entries(runnerSkills)) {
      const firstActivation = activations[0];

      skillPositions.push({
        id: skillId,
        name: getSkillNameById(skillId),
        triggeredAt: firstActivation.start,
        effects: activations.map((a) => ({
          effectType: a.effectType,
          effectTarget: a.effectTarget,
          start: a.start,
          end: a.end,
          duration: a.end - a.start
        }))
      });
    }

    return skillPositions.toSorted((a, b) => a.triggeredAt - b.triggeredAt);
  }, [chartData, runnerIndex]);
};

type SkillPosition = {
  id: string;
  name: string;
  triggeredAt: number;
  effects: Array<{
    start: number;
    end: number;
    duration: number;
    effectType: ISkillType;
    effectTarget: ISkillTarget;
  }>;
};

export const SkillsTab = () => {
  const { chartData } = useRaceStore();

  const skillPositionsUma1 = useRunnerSkillsActivated(0);
  const skillPositionsUma2 = useRunnerSkillsActivated(1);

  const hasUma1Skills = skillPositionsUma1.length > 0;
  const hasUma2Skills = skillPositionsUma2.length > 0;

  const totalSkillDistanceUma1 = useMemo(() => {
    if (!chartData) return 0;

    const runnerSkills = chartData.skillActivations[0];
    let totalSkillDistance = 0;

    for (const [_, activations] of Object.entries(runnerSkills)) {
      let validActivation;
      for (const activation of activations) {
        if (activation.effectType !== SkillType.Recovery) {
          validActivation = activation;
          break;
        }
      }

      if (!validActivation) continue;

      totalSkillDistance += validActivation.end - validActivation.start;
    }

    return totalSkillDistance;
  }, [chartData]);

  const totalSkillDistanceUma2 = useMemo(() => {
    if (!chartData) return 0;

    const runnerSkills = chartData.skillActivations[1];
    let totalSkillDistance = 0;

    for (const [_, activations] of Object.entries(runnerSkills)) {
      let validActivation;
      for (const activation of activations) {
        if (activation.effectType !== SkillType.Recovery) {
          validActivation = activation;
          break;
        }
      }

      if (!validActivation) continue;

      totalSkillDistance += validActivation.end - validActivation.start;
    }

    return totalSkillDistance;
  }, [chartData]);

  if (!chartData) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Zap />
          </EmptyMedia>
          <EmptyTitle>No Skill Data</EmptyTitle>
          <EmptyDescription>
            Run a simulation to see when and where skills activate during the race.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  if (!hasUma1Skills && !hasUma2Skills) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground">
        No skills activated during this simulation run.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Side-by-side skill tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uma 1 Skills */}
        <RunnerSkillsTable
          skills={skillPositionsUma1}
          hasSkills={hasUma1Skills}
          runnerColor="#2a77c5"
          totalDistance={totalSkillDistanceUma1}
        />

        {/* Uma 2 Skills */}
        <RunnerSkillsTable
          skills={skillPositionsUma2}
          hasSkills={hasUma2Skills}
          runnerColor="#c52a2a"
          totalDistance={totalSkillDistanceUma2}
        />
      </div>
    </div>
  );
};

type RunnerSkillsTableProps = {
  skills: Array<SkillPosition>;
  hasSkills: boolean;
  runnerColor: string;
  totalDistance: number;
};

const RunnerSkillsTable = (props: RunnerSkillsTableProps) => {
  const { skills, hasSkills, runnerColor, totalDistance } = props;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className={`bg-[${runnerColor}] text-white p-2 py-2 font-bold`}>Skills</div>

      <div className="flex justify-between p-2 border-b border-border">
        <span className="text-muted-foreground text-sm">Total Skill Distance</span>
        <span className="font-mono font-medium text-sm">{totalDistance.toFixed(1)}m</span>
      </div>

      {hasSkills ? (
        <div className="grid grid-cols-1">
          <div className="grid grid-cols-2 border-b last:border-b-0 p-2">
            <div className="text-sm">Skill</div>
            <div className="text-right text-sm">Trigger At</div>
          </div>

          <div className="grid grid-cols-1">
            {skills.map((skill) => (
              <div key={skill.id} className="grid grid-cols-1 border-b last:border-b-0 p-2">
                <Collapsible>
                  <CollapsibleTrigger className="w-full">
                    <div className="grid grid-cols-2">
                      <div className="flex items-center gap-2 cursor-pointer">
                        <ChevronsUpDown className="size-4" />
                        <span className="font-medium text-sm select-none">{skill.name}</span>
                      </div>
                      <div className="font-mono text-end text-sm">
                        {skill.triggeredAt.toFixed(1)}m
                      </div>
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="flex flex-col gap-2 pt-2">
                    <div className="grid grid-cols-5">
                      <div className="text-sm">Type</div>
                      <div className="text-end text-sm">Target</div>
                      <div className="text-end text-sm">Start</div>
                      <div className="text-end text-sm">End</div>
                      <div className="text-end text-sm">Duration</div>
                    </div>

                    {skill.effects.map((effect, effectIndex) => {
                      const effectType = translateSkillEffectType(effect.effectType);
                      const effectTarget = translateSkillEffectTarget(effect.effectTarget);

                      return (
                        <div key={`${skill.id}-${effectIndex}`} className="grid grid-cols-5">
                          <div className="text-sm">{effectType}</div>
                          <div className="text-end text-sm">{effectTarget}</div>
                          <div className="text-end text-sm">{effect.start.toFixed(1)}m</div>
                          <div className="text-end text-sm">{effect.end.toFixed(1)}m</div>
                          <div className="text-end text-sm">{effect.duration.toFixed(1)}m</div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="p-4 text-center text-foreground text-sm">No skills activated</div>
      )}
    </div>
  );
};
