import { RegionDisplayType } from '@/modules/racetrack/types';
import {
  SimulationRun,
  SkillActivation,
} from '@/modules/simulation/compare.types';
import { SkillType } from '@/modules/simulation/lib/race-solver/types';
import { getSkillNameById } from '@/modules/skills/utils';
import { useSettingsStore } from '@/store/settings.store';
import { useSelectedPacemakerIndices } from '@/store/settings/actions';
import { useUIStore } from '@/store/ui.store';
import {
  colors,
  pacemakerColors,
  posKeepColors,
  rushedColors,
} from '@/utils/colors';
import { PosKeepLabel } from '@/utils/races';
import { CourseHelpers } from '@simulation/lib/CourseData';
import { PosKeepMode } from '@simulation/lib/RaceSolver';
import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';

export type RegionData = {
  type: RegionDisplayType;
  regions: {
    start: number;
    end: number;
  }[];

  color: {
    fill: string;
    stroke: string;
  };

  text: string;
  height?: number;
  skillId?: string;
  umaIndex?: number;
};

const getStateName = (state: number) => {
  switch (state) {
    case 1:
      return 'PU';
    case 2:
      return 'PDM';
    case 3:
      return 'SU';
    case 4:
      return 'O';
    default:
      return 'Unknown';
  }
};

const getSkillActivation = (
  skillId: string,
  activations: SkillActivation[],
  umaIndex: number,
) => {
  const validActivation = activations.find(
    (activation) => activation.effectType !== SkillType.Recovery,
  );

  if (!validActivation) return null;

  return {
    type: RegionDisplayType.Textbox,
    color: colors[umaIndex],
    text: getSkillNameById(skillId),
    skillId: skillId,
    umaIndex: umaIndex,
    regions: [{ start: validActivation.start, end: validActivation.end }],
  };
};

type UseVisualizationDataProps = {
  chartData: SimulationRun;
};

export const useVisualizationData = (props: UseVisualizationDataProps) => {
  const { chartData } = props;

  const { posKeepMode, courseId } = useSettingsStore(
    useShallow((state) => ({
      posKeepMode: state.posKeepMode,
      courseId: state.courseId,
    })),
  );

  const { showVirtualPacemakerOnGraph } = useUIStore(
    useShallow((state) => ({
      showVirtualPacemakerOnGraph: state.showVirtualPacemakerOnGraph,
    })),
  );

  const selectedPacemakerIndices = useSelectedPacemakerIndices();

  const course = useMemo(() => CourseHelpers.getCourse(courseId), [courseId]);

  const skillActivations: RegionData[] = useMemo(() => {
    if (!chartData?.sk) return [];

    const runnerASkills = chartData.sk[0];
    const runnerBSkills = chartData.sk[1];

    const skills = [];

    for (const [skillId, activations] of runnerASkills.entries()) {
      const skillActivation = getSkillActivation(skillId, activations, 0);

      if (skillActivation) {
        skills.push(skillActivation);
      }
    }

    for (const [skillId, activations] of runnerBSkills.entries()) {
      const skillActivation = getSkillActivation(skillId, activations, 1);

      if (skillActivation) {
        skills.push(skillActivation);
      }
    }

    return skills;
  }, [chartData]);

  const rushedIndicators: RegionData[] = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.rushed) return [];

    const rushedIndicators = [];

    for (const [umaIndex, rushArray] of chartData.rushed.entries()) {
      for (const rush of rushArray) {
        rushedIndicators.push({
          type: RegionDisplayType.Textbox,
          color: rushedColors[umaIndex],
          text: 'Rushed',
          regions: [{ start: rush[0], end: rush[1] }],
        });
      }
    }

    return rushedIndicators;
  }, [chartData]);

  const posKeepData: PosKeepLabel[] = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.posKeep) return [];

    const posKeepData = [];

    for (const [umaIndex, posKeepArray] of chartData.posKeep.entries()) {
      for (const posKeep of posKeepArray) {
        const stateName = getStateName(posKeep[2]);

        posKeepData.push({
          umaIndex: umaIndex,
          text: stateName,
          color: posKeepColors[umaIndex],
          start: posKeep[0],
          end: posKeep[1],
          duration: posKeep[1] - posKeep[0],
        });
      }
    }

    return posKeepData;
  }, [chartData]);

  const virtualPacemakerPosKeepData: PosKeepLabel[] = useMemo(() => {
    if (!chartData) return [];

    if (
      !showVirtualPacemakerOnGraph ||
      posKeepMode !== PosKeepMode.Virtual ||
      chartData.pacerPosKeep == null
    ) {
      return [];
    }

    const pacemakerPosKeepData = [];

    for (let pacemakerIndex = 0; pacemakerIndex < 3; pacemakerIndex++) {
      if (
        selectedPacemakerIndices.includes(pacemakerIndex) &&
        chartData.pacerPosKeep &&
        chartData.pacerPosKeep[pacemakerIndex]
      ) {
        const pacerPosKeepArray = chartData.pacerPosKeep[pacemakerIndex];

        for (const posKeep of pacerPosKeepArray) {
          const stateName = getStateName(posKeep[2]);

          pacemakerPosKeepData.push({
            umaIndex: 2 + pacemakerIndex,
            text: stateName,
            color: pacemakerColors[pacemakerIndex],
            start: posKeep[0],
            end: posKeep[1],
            duration: posKeep[1] - posKeep[0],
          });
        }
      }
    }

    return pacemakerPosKeepData;
  }, [
    chartData,
    showVirtualPacemakerOnGraph,
    posKeepMode,
    selectedPacemakerIndices,
  ]);

  const competeFightData = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.competeFight) return [];

    const competeFightData = [];

    for (const [
      umaIndex,
      competeFightArray,
    ] of chartData.competeFight.entries()) {
      if (competeFightArray.length === 0) continue;

      const start = competeFightArray[0];
      const end = competeFightArray[1];

      competeFightData.push({
        umaIndex: umaIndex,
        text: 'Duel',
        color: posKeepColors[umaIndex],
        start: start,
        end: end,
        duration: end - start,
      });
    }

    return competeFightData;
  }, [chartData]);

  const leadCompetitionData = useMemo(() => {
    if (!chartData) return [];
    if (!chartData.leadCompetition) return [];

    const leadCompetitionData = [];

    for (const [
      umaIndex,
      leadCompetitionArray,
    ] of chartData.leadCompetition.entries()) {
      if (!leadCompetitionArray || leadCompetitionArray.length === 0) {
        continue;
      }

      const start = leadCompetitionArray[0];
      const end = leadCompetitionArray[1];

      leadCompetitionData.push({
        umaIndex: umaIndex,
        text: 'SS',
        color: posKeepColors[umaIndex],
        start: start,
        end: end,
        duration: end - start,
      });
    }

    return leadCompetitionData;
  }, [chartData]);

  const virtualPacemakerLeadCompetitionData = useMemo(() => {
    if (!chartData) return [];
    if (
      !showVirtualPacemakerOnGraph ||
      posKeepMode !== PosKeepMode.Virtual ||
      chartData.pacerLeadCompetition == null
    )
      return [];

    const pacemakerLeadCompetitionData: PosKeepLabel[] = [];

    for (let pacemakerIndex = 0; pacemakerIndex < 3; pacemakerIndex++) {
      if (
        selectedPacemakerIndices.includes(pacemakerIndex) &&
        chartData.pacerLeadCompetition &&
        chartData.pacerLeadCompetition[pacemakerIndex] &&
        chartData.pacerLeadCompetition[pacemakerIndex].length > 0
      ) {
        const leadCompetitionArray =
          chartData.pacerLeadCompetition[pacemakerIndex];

        const start = leadCompetitionArray[0] ?? 0;
        const end = leadCompetitionArray[1] ?? 0;
        const color = pacemakerColors[
          pacemakerIndex as keyof typeof pacemakerColors
        ] as {
          stroke: string;
          fill: string;
        };

        pacemakerLeadCompetitionData.push({
          umaIndex: 2 + pacemakerIndex,
          text: 'SS',
          color: color,
          start: start,
          end: end,
          duration: end - start,
        });
      }
    }
    return pacemakerLeadCompetitionData;
  }, [
    chartData,
    showVirtualPacemakerOnGraph,
    posKeepMode,
    selectedPacemakerIndices,
  ]);

  const labels = useMemo(() => {
    return [
      ...posKeepData,
      ...virtualPacemakerPosKeepData,
      ...competeFightData,
      ...leadCompetitionData,
      ...virtualPacemakerLeadCompetitionData,
    ];
  }, [
    posKeepData,
    virtualPacemakerPosKeepData,
    competeFightData,
    leadCompetitionData,
    virtualPacemakerLeadCompetitionData,
  ]);

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

  const posKeepLabels: PosKeepLabel[] = useMemo(() => {
    const posKeepLabels = [];

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
      posKeepLabels.push(updatedLabel);
    }

    return posKeepLabels;
  }, [tempLabels]);

  return {
    skillActivations,
    rushedIndicators,
    posKeepLabels,
  };
};
