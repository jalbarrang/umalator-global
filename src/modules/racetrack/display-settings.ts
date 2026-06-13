export type RaceTrackDisplaySettings = {
  showVelocityUma1: boolean;
  showVelocityUma2: boolean;
  showHpUma1: boolean;
  showHpUma2: boolean;
  showLanesUma1: boolean;
  showLanesUma2: boolean;

  showThresholdHalfway: boolean;
  showThreshold777: boolean;
  showThreshold200: boolean;

  showSkillMarkers: boolean;
  showDebuffMarkers: boolean;
  showRushedMarkers: boolean;
  showScenarioMarkers: boolean;
  showPosKeepLabels: boolean;
};

export const defaultRaceTrackDisplaySettings = (): RaceTrackDisplaySettings => ({
  showVelocityUma1: true,
  showVelocityUma2: true,
  showHpUma1: false,
  showHpUma2: false,
  showLanesUma1: false,
  showLanesUma2: false,

  showThresholdHalfway: true,
  showThreshold777: true,
  showThreshold200: true,

  showSkillMarkers: true,
  showDebuffMarkers: true,
  showRushedMarkers: true,
  showScenarioMarkers: true,
  showPosKeepLabels: true
});

type LegacyRaceTrackDisplay = {
  showUma1?: boolean;
  showUma2?: boolean;
  showHp?: boolean;
  showLanes?: boolean;
  showThresholds?: boolean;
};

const applyRunnerVisibility = (
  umaVisible: boolean,
  value: boolean | undefined,
  fallback: boolean
) => (umaVisible ? (value ?? fallback) : false);

export const migrateRaceTrackDisplaySettings = (
  state: LegacyRaceTrackDisplay & Partial<RaceTrackDisplaySettings>
): RaceTrackDisplaySettings => {
  const defaults = defaultRaceTrackDisplaySettings();

  const showThresholds = state.showThresholds ?? defaults.showThresholdHalfway;
  const showHp = state.showHp ?? defaults.showHpUma1;
  const showLanes = state.showLanes ?? defaults.showLanesUma1;
  const uma1Visible = state.showUma1 ?? true;
  const uma2Visible = state.showUma2 ?? true;

  return {
    showVelocityUma1: applyRunnerVisibility(
      uma1Visible,
      state.showVelocityUma1,
      defaults.showVelocityUma1
    ),
    showVelocityUma2: applyRunnerVisibility(
      uma2Visible,
      state.showVelocityUma2,
      defaults.showVelocityUma2
    ),
    showHpUma1: applyRunnerVisibility(uma1Visible, state.showHpUma1 ?? showHp, defaults.showHpUma1),
    showHpUma2: applyRunnerVisibility(uma2Visible, state.showHpUma2 ?? showHp, defaults.showHpUma2),
    showLanesUma1: applyRunnerVisibility(
      uma1Visible,
      state.showLanesUma1 ?? showLanes,
      defaults.showLanesUma1
    ),
    showLanesUma2: applyRunnerVisibility(
      uma2Visible,
      state.showLanesUma2 ?? showLanes,
      defaults.showLanesUma2
    ),
    showThresholdHalfway: state.showThresholdHalfway ?? showThresholds,
    showThreshold777: state.showThreshold777 ?? showThresholds,
    showThreshold200: state.showThreshold200 ?? showThresholds,
    showSkillMarkers: state.showSkillMarkers ?? defaults.showSkillMarkers,
    showDebuffMarkers: state.showDebuffMarkers ?? defaults.showDebuffMarkers,
    showRushedMarkers: state.showRushedMarkers ?? defaults.showRushedMarkers,
    showScenarioMarkers: state.showScenarioMarkers ?? defaults.showScenarioMarkers,
    showPosKeepLabels: state.showPosKeepLabels ?? defaults.showPosKeepLabels
  };
};

export const raceTrackDisplayKeys = Object.keys(defaultRaceTrackDisplaySettings()) as Array<
  keyof RaceTrackDisplaySettings
>;
