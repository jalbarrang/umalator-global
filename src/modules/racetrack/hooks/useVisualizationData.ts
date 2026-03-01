import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import type { SimulationRun, SkillEffectLog } from '@/modules/simulation/compare.types';
import type { PosKeepLabel } from '@/utils/races';
import { RegionDisplayType } from '@/modules/racetrack/types';
import { getSkillNameById } from '@/modules/skills/utils';
import { useSettingsStore } from '@/store/settings.store';
import { colors, posKeepColors, rushedColors } from '@/utils/colors';
import { SkillPerspective, SkillType } from '@/lib/sunday-tools/skills/definitions';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';

export type RegionData = {
  type: RegionDisplayType;
  regions: Array<{
    start: number;
    end: number;
  }>;

  color: {
    fill: string;
    stroke: string;
  };

  text: string;
  height?: number;
  skillId?: string;
  umaIndex?: number;
  effectType?: number;
};

const getSkillActivation = (
  skillId: string,
  activations: Array<SkillEffectLog>,
  umaIndex: number,
) => {
  const validActivation = activations.find(
    (activation) =>
      activation.effectType !== SkillType.Recovery &&
      activation.perspective === SkillPerspective.Self,
  );

  if (!validActivation) return null;

  return {
    type: RegionDisplayType.Textbox,
    color: colors[umaIndex],
    text: getSkillNameById(skillId),
    skillId: skillId,
    umaIndex: umaIndex,
    effectType: validActivation.effectType,
    regions: [{ start: validActivation.start, end: validActivation.end }],
  };
};

type UseVisualizationDataProps = {
  chartData: SimulationRun;
};

export const useVisualizationData = (props: UseVisualizationDataProps) => {
  const { chartData } = props;

  const { courseId } = useSettingsStore(
    useShallow((state) => ({
      courseId: state.courseId,
    })),
  );

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const skillActivations: Array<RegionData> = useMemo(() => {
    if (!chartData?.skillActivations) return [];

    const runnerASkills = chartData.skillActivations[0];
    const runnerBSkills = chartData.skillActivations[1];

    const skills = [];

    for (const [skillId, activations] of Object.entries(runnerASkills)) {
      const skillActivation = getSkillActivation(skillId, activations, 0);

      if (skillActivation) {
        skills.push(skillActivation);
      }
    }

    for (const [skillId, activations] of Object.entries(runnerBSkills)) {
      const skillActivation = getSkillActivation(skillId, activations, 1);

      if (skillActivation) {
        skills.push(skillActivation);
      }
    }

    return skills;
  }, [chartData]);

  const rushedIndicators: Array<RegionData> = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.rushed) return [];

    const results = [];

    for (const [umaIndex, rushArray] of chartData.rushed.entries()) {
      for (const rush of rushArray) {
        results.push({
          type: RegionDisplayType.Textbox,
          color: rushedColors[umaIndex],
          text: 'Rushed',
          umaIndex,
          regions: [{ start: rush[0], end: rush[1] }],
        });
      }
    }

    return results;
  }, [chartData]);

  const posKeepData: Array<PosKeepLabel> = useMemo(() => {
    return [];
  }, []);

  const competeFightData = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.duelingRegions) return [];

    const results = [];

    for (const [umaIndex, competeFightArray] of chartData.duelingRegions.entries()) {
      if (competeFightArray.length === 0) continue;

      const start = competeFightArray[0];
      const end = competeFightArray[1];

      results.push({
        umaIndex: umaIndex,
        text: 'Duel',
        color: posKeepColors[umaIndex],
        start: start,
        end: end,
        duration: end - start,
      });
    }

    return results;
  }, [chartData]);

  const leadCompetitionData = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.spotStruggleRegions) return [];

    const results = [];

    for (const [umaIndex, leadCompetitionArray] of chartData.spotStruggleRegions.entries()) {
      if (!leadCompetitionArray || leadCompetitionArray.length === 0) {
        continue;
      }

      const start = leadCompetitionArray[0];
      const end = leadCompetitionArray[1];

      results.push({
        umaIndex: umaIndex,
        text: 'SS',
        color: posKeepColors[umaIndex],
        start: start,
        end: end,
        duration: end - start,
      });
    }

    return results;
  }, [chartData]);

  const labels = useMemo(() => {
    return [...posKeepData, ...competeFightData, ...leadCompetitionData];
  }, [posKeepData, competeFightData, leadCompetitionData]);

  const tempLabels = useMemo(
    () =>
      labels
        .map((posKeep) => ({
          ...posKeep,
          x: (posKeep.start / course.distance) * 960,
          width: (posKeep.duration / course.distance) * 960,
          yOffset: 0,
        }))
        .toSorted((a, b) => a.x - b.x),
    [labels, course],
  );

  const posKeepLabels: Array<PosKeepLabel> = useMemo(() => {
    const results = [];

    for (let i = 0; i < tempLabels.length; i++) {
      const currentLabel = tempLabels[i];
      let maxYOffset = 40;

      for (let j = 0; j < i; j++) {
        const prevLabel = tempLabels[j];

        // Check if labels overlap horizontally
        const padding = 0; // Add padding to prevent labels from being too close
        const overlap = !(
          currentLabel.x + currentLabel.width + padding < prevLabel.x ||
          currentLabel.x > prevLabel.x + prevLabel.width + padding
        );

        if (overlap) {
          // Labels overlap, need to offset vertically
          maxYOffset = Math.max(maxYOffset, prevLabel.yOffset + 15);
        }
      }

      const updatedLabel = { ...currentLabel, yOffset: maxYOffset };
      results.push(updatedLabel);
    }

    return results;
  }, [tempLabels]);

  return {
    skillActivations,
    rushedIndicators,
    posKeepLabels,
  };
};
