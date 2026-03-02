import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import type { SimulationRun, SkillEffectLog } from '@/modules/simulation/compare.types';
import type { PosKeepLabel } from '@/utils/races';
import { RegionDisplayType } from '@/modules/racetrack/types';
import { getSkillById, getSkillNameById } from '@/modules/skills/utils';
import { useSettingsStore } from '@/store/settings.store';
import { colors, debuffColors, posKeepColors, recoveryColors, rushedColors } from '@/utils/colors';
import { SkillPerspective, SkillTarget, SkillType } from '@/lib/sunday-tools/skills/definitions';
import { CourseHelpers } from '@/lib/sunday-tools/course/CourseData';
import { isExternalDebuffEffect } from '@/lib/sunday-tools/skills/external-debuffs';
import { useDebuffs } from '@/modules/simulation/stores/compare.store';

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
  debuffId?: string;
};

const INSTANT_DURATION_THRESHOLD = 1;

const getDebuffIndicatorEffectType = (skillId: string): number => {
  try {
    const skillData = getSkillById(skillId);

    for (const alternative of skillData.alternatives) {
      for (const effect of alternative.effects) {
        const type = effect.type ?? SkillType.Noop;
        const target = effect.target ?? SkillTarget.Self;
        const modifier = effect.modifier ?? 0;

        if (isExternalDebuffEffect({ type, target, modifier })) {
          return type;
        }
      }
    }

    return skillData.alternatives[0]?.effects[0]?.type ?? SkillType.Noop;
  } catch {
    return SkillType.Noop;
  }
};

const getSkillActivations = (
  skillId: string,
  activations: Array<SkillEffectLog>,
  umaIndex: number,
): Array<RegionData> => {
  const selfEffects = activations.filter((a) => a.perspective === SkillPerspective.Self);
  if (selfEffects.length === 0) return [];

  const grouped = new Map<number, Array<SkillEffectLog>>();
  for (const effect of selfEffects) {
    const key = effect.start;
    const group = grouped.get(key);
    if (group) group.push(effect);
    else grouped.set(key, [effect]);
  }

  const results: Array<RegionData> = [];

  for (const effects of grouped.values()) {
    const durationEffect = effects.find((e) => e.end - e.start > INSTANT_DURATION_THRESHOLD);

    if (durationEffect) {
      const isRecovery = durationEffect.effectType === SkillType.Recovery;
      results.push({
        type: RegionDisplayType.Textbox,
        color: isRecovery ? recoveryColors[umaIndex] : colors[umaIndex],
        text: getSkillNameById(skillId),
        skillId,
        umaIndex,
        effectType: durationEffect.effectType,
        regions: [{ start: durationEffect.start, end: durationEffect.end }],
      });
    } else {
      const repr = effects[0];
      const isRecovery = repr.effectType === SkillType.Recovery;
      results.push({
        type: RegionDisplayType.Immediate,
        color: isRecovery ? recoveryColors[umaIndex] : colors[umaIndex],
        text: getSkillNameById(skillId),
        skillId,
        umaIndex,
        effectType: repr.effectType,
        regions: [{ start: repr.start, end: repr.end }],
      });
    }
  }

  return results;
};

type UseVisualizationDataProps = {
  chartData: SimulationRun;
};

export const useVisualizationData = (props: UseVisualizationDataProps) => {
  const { chartData } = props;
  const debuffs = useDebuffs();

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

    const skills: Array<RegionData> = [];

    for (const [skillId, activations] of Object.entries(runnerASkills)) {
      skills.push(...getSkillActivations(skillId, activations, 0));
    }

    for (const [skillId, activations] of Object.entries(runnerBSkills)) {
      skills.push(...getSkillActivations(skillId, activations, 1));
    }

    return skills;
  }, [chartData]);

  const rushedIndicators: Array<RegionData> = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.rushed) return [];

    const results: Array<RegionData> = [];

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

  const debuffIndicators: Array<RegionData> = useMemo(() => {
    const results: Array<RegionData> = [];
    const entries: Array<[number, typeof debuffs.uma1]> = [
      [0, debuffs.uma1],
      [1, debuffs.uma2],
    ];

    for (const [umaIndex, umaDebuffs] of entries) {
      for (const debuff of umaDebuffs) {
        results.push({
          type: RegionDisplayType.Immediate,
          color: debuffColors[umaIndex],
          text: getSkillNameById(debuff.skillId),
          skillId: debuff.skillId,
          umaIndex,
          effectType: getDebuffIndicatorEffectType(debuff.skillId),
          debuffId: debuff.id,
          regions: [{ start: debuff.position, end: debuff.position }],
        });
      }
    }

    return results;
  }, [debuffs]);

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
    debuffIndicators,
    posKeepLabels,
  };
};
