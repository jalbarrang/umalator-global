import { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ActivationEffectChart } from './ActivationEffectChart';
import { LengthDifferenceChart } from './LengthDifferenceChart';
import type {
  SkillSimulationData,
  SkillTrackedMetaCollection,
} from '@/modules/simulation/compare.types';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';

type ActivationDetailsProps = {
  skillId: string;
  runData: SkillSimulationData;
  skillActivations: Record<string, SkillTrackedMetaCollection>;
  courseDistance: number;
  currentSeed: number | null;
  isGlobalSimulationRunning: boolean;
  isSkillLoading?: boolean;
  onRunAdditionalSamples?: (skillId: string, additionalSamples: number) => void;
};

// Component to show detailed activation info in expanded row
export function ActivationDetails(props: ActivationDetailsProps) {
  const {
    skillId,
    skillActivations,
    courseDistance,
    currentSeed,
    isGlobalSimulationRunning,
    isSkillLoading = false,
    onRunAdditionalSamples,
  } = props;

  const currentSkillActivations = useMemo(
    () => skillActivations[skillId],
    [skillId, skillActivations],
  );

  const activationPositions = useMemo(
    () => currentSkillActivations.map((activation) => activation.positions).flat(),
    [currentSkillActivations],
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
      <Card>
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

  const canRunAdditionalSamples =
    currentSeed !== null && !isGlobalSimulationRunning && !isSkillLoading && onRunAdditionalSamples;

  const handleRunAdditionalSamples = () => {
    if (onRunAdditionalSamples) {
      onRunAdditionalSamples(skillId, 1000);
    }
  };

  return (
    <Card className="rounded-none">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Skill Activation Analysis</CardTitle>

          <div className="flex items-center gap-4 text-xs">
            {/* <div className="flex items-end gap-1">
              <span className="text-muted-foreground">Avg. Proc Position:</span>
              <span className="font-semibold">{Math.round(stats.averagePosition)}m</span>
            </div> */}
            <div className="flex items-end gap-1">
              <span className="text-muted-foreground">Proc Range: </span>
              <span className="font-semibold">
                {Math.round(stats.earliestPosition)}-{Math.round(stats.latestPosition)}m
              </span>
            </div>
            {/* <div className="flex items-end gap-1">
              <span className="text-muted-foreground">Primary Phase: </span>
              <span className="font-semibold">{stats.primaryPhase}</span>
            </div> */}
            <div className="flex items-end gap-1">
              <span className="text-muted-foreground">Samples: </span>
              <span className="font-semibold">{totalActivations}</span>
            </div>

            {isSkillLoading && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running...
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        {onRunAdditionalSamples && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRunAdditionalSamples}
              disabled={!canRunAdditionalSamples}
              className="gap-1"
            >
              {isSkillLoading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Running...
                </>
              ) : (
                <>Run +1000 Samples</>
              )}
            </Button>

            {!currentSeed && (
              <span className="text-xs text-muted-foreground">
                Run a simulation first to enable additional samples
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ActivationEffectChart
            skillId={skillId}
            skillActivations={activationPositions}
            courseDistance={courseDistance}
          />
          <LengthDifferenceChart
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
        </div>
      </CardContent>
    </Card>
  );
}
