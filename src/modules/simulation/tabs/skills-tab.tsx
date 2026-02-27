import { useMemo } from 'react';

import { ChevronsUpDown, Zap } from 'lucide-react';
import type { ISkillTarget, ISkillType } from '@/lib/sunday-tools/skills/definitions';
import { useRaceStore } from '@/modules/simulation/stores/compare.store';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { getSkillNameById } from '@/modules/skills/utils';
import {
  SkillType,
  translateSkillEffectTarget,
  translateSkillEffectType,
} from '@/lib/sunday-tools/skills/definitions';

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
          duration: a.end - a.start,
        })),
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
          title="Umamusume 1 Skills"
          skills={skillPositionsUma1}
          hasSkills={hasUma1Skills}
          runnerColor="#2a77c5"
        />

        {/* Uma 2 Skills */}
        <RunnerSkillsTable
          title="Umamusume 2 Skills"
          skills={skillPositionsUma2}
          hasSkills={hasUma2Skills}
          runnerColor="#c52a2a"
        />
      </div>

      {/* Skills Summary */}
      <div className="bg-background border-2 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">Skills Summary</h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex flex-col items-center p-3  rounded-lg border">
            <span className="text-[#2a77c5] font-bold text-2xl">{skillPositionsUma1.length}</span>
            <span className="text-foreground text-xs">Uma 1 Activations</span>
          </div>
          <div className="flex flex-col items-center p-3  rounded-lg border">
            <span className="text-[#c52a2a] font-bold text-2xl">{skillPositionsUma2.length}</span>
            <span className="text-foreground text-xs">Uma 2 Activations</span>
          </div>
          <div className="flex flex-col items-center p-3  rounded-lg border">
            <span className="text-[#2a77c5] font-bold text-lg font-mono">
              {totalSkillDistanceUma1.toFixed(1)}m
            </span>
            <span className="text-foreground text-xs">Uma 1 Total Skill Distance</span>
          </div>
          <div className="flex flex-col items-center p-3  rounded-lg border">
            <span className="text-[#c52a2a] font-bold text-lg font-mono">
              {totalSkillDistanceUma2.toFixed(1)}m
            </span>
            <span className="text-foreground text-xs">Uma 2 Total Skill Distance</span>
          </div>
        </div>
      </div>
    </div>
  );
};

type RunnerSkillsTableProps = {
  title: string;
  skills: Array<SkillPosition>;
  hasSkills: boolean;
  runnerColor: string;
};

const RunnerSkillsTable = (props: RunnerSkillsTableProps) => {
  const { title, skills, hasSkills, runnerColor } = props;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={`bg-[${runnerColor}] text-white text-center py-2 font-bold`}>
        {title}
        {hasSkills && (
          <span className="ml-2 text-sm font-normal opacity-80">({skills.length} activations)</span>
        )}
      </div>
      {hasSkills ? (
        <div className="grid grid-cols-1">
          <div className="grid grid-cols-2 border-b last:border-b-0 p-2">
            <div>Skill</div>
            <div className="text-right">Trigger At</div>
          </div>

          <div className="grid grid-cols-1">
            {skills.map((skill, index) => (
              <div
                key={`${skill.id}-${index}`}
                className="grid grid-cols-1 border-b last:border-b-0 p-2"
              >
                <Collapsible>
                  <CollapsibleTrigger>
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
