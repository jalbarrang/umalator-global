import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ActivationEffectChart } from './ActivationEffectChart';
import type { SkillSimulationData } from '@/modules/simulation/compare.types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';

type ActivationDetailsProps = {
  skillId: string;
  runData: SkillSimulationData;
  skillActivations: Record<string, Array<{ position: number }>>;
  courseDistance: number;
};

// Component to show detailed activation info in expanded row
export function ActivationDetails(props: ActivationDetailsProps) {
  const { skillId, skillActivations, courseDistance } = props;

  const activationPositions = useMemo(
    () => skillActivations[skillId].map((activation) => activation.position),
    [skillId, skillActivations],
  );

  const totalActivations = useMemo(() => activationPositions.length, [activationPositions]);
  const hasActivations = useMemo(() => totalActivations > 0, [totalActivations]);

  const stats = useMemo(() => {
    let earliestPosition = 0;
    let latestPosition = 0;
    let averagePosition = 0;
    let primaryPhase = '';

    if (hasActivations) {
      const sorted = activationPositions.sort((a, b) => a - b);

      earliestPosition = sorted[0];
      latestPosition = sorted[sorted.length - 1];
      averagePosition = activationPositions.reduce((sum, pos) => sum + pos, 0) / totalActivations;

      // Determine primary activation phase using CourseHelpers
      const phase1Start = CourseHelpers.phaseStart(courseDistance, 1);
      const phase2Start = CourseHelpers.phaseStart(courseDistance, 2);
      const phase3Start = CourseHelpers.phaseStart(courseDistance, 3);

      if (averagePosition < phase1Start) {
        primaryPhase = 'Early Race';
      } else if (averagePosition < phase2Start) {
        primaryPhase = 'Mid Race';
      } else if (averagePosition < phase3Start) {
        primaryPhase = 'Late Race';
      } else {
        primaryPhase = 'Last Spurt';
      }
    }

    return {
      earliestPosition,
      latestPosition,
      averagePosition,
      primaryPhase,
    };
  }, [activationPositions, courseDistance, hasActivations, totalActivations]);

  if (!hasActivations) {
    return (
      <Card className="mt-2">
        <CardContent className="py-8 text-center">
          <div className="text-sm text-muted-foreground">
            No activation data available - this skill did not activate in any simulation runs.
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            This may indicate that the skill's activation conditions are not met for this race
            configuration.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-2 rounded-none">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Skill Activation Analysis</CardTitle>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-end gap-1">
              <span className="text-muted-foreground">Avg. Proc Position:</span>
              <span className="font-semibold">{Math.round(stats.averagePosition)}m</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-muted-foreground">Proc Range: </span>
              <span className="font-semibold">
                {Math.round(stats.earliestPosition)}-{Math.round(stats.latestPosition)}m
              </span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-muted-foreground">Primary Phase: </span>
              <span className="font-semibold">{stats.primaryPhase}</span>
            </div>
            {/* Hidden for now */}
            {/* <div className="flex flex-col items-end">
              <span className="text-muted-foreground">Activations</span>
              <span className="font-semibold">{totalActivations}</span>
            </div> */}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {/* TODO: Add button that lets run additional samples for this specific skill */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <ActivationEffectChart
            skillId={skillId}
            skillActivations={skillActivations}
            courseDistance={courseDistance}
          />
        </div>

        <div className="border-t flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(0,154,111)' }} />
              <span className="text-muted-foreground">Early Race</span>
            </div>

            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(242,233,103)' }} />
              <span className="text-muted-foreground">Mid Race</span>
            </div>

            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(209,134,175)' }} />
              <span className="text-muted-foreground">Late Race</span>
            </div>

            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: 'rgb(255,130,130)' }} />
              <span className="text-muted-foreground">Last Spurt</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            This visualization shows where along the race course this skill typically activates. Use
            this information to understand if the skill's activation conditions match your race
            strategy.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
