export const SimulationMode = {
  Compare: 0,
  Chart: 1,
  UniquesChart: 2,
} as const;
export type ISimulationMode = (typeof SimulationMode)[keyof typeof SimulationMode];
export const ModeName = {
  [SimulationMode.Compare]: 'Compare',
  [SimulationMode.Chart]: 'Skill Chart',
  [SimulationMode.UniquesChart]: 'Uma Chart',
} as const;
