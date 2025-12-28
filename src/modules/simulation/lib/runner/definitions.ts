export const Mood = {
  Awful: -2,
  Bad: -1,
  Normal: 0,
  Good: 1,
  Great: 2,
} as const;
export type IMood = (typeof Mood)[keyof typeof Mood];
export const moods = Object.values(Mood);
export const MoodName = {
  [Mood.Awful]: 'Awful',
  [Mood.Bad]: 'Bad',
  [Mood.Normal]: 'Normal',
  [Mood.Good]: 'Good',
  [Mood.Great]: 'Great',
} as const;

// Position Keep Mode
export const PosKeepMode = {
  None: 0,
  Approximate: 1,
  Virtual: 2,
} as const;
export type IPosKeepMode = (typeof PosKeepMode)[keyof typeof PosKeepMode];
export const PosKeepModeName = {
  [PosKeepMode.None]: 'None',
  [PosKeepMode.Approximate]: 'Approximate',
  [PosKeepMode.Virtual]: 'Virtual Pacemaker',
} as const;

export const Aptitude = {
  S: 0,
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
} as const;
export type IAptitude = (typeof Aptitude)[keyof typeof Aptitude];
export const aptitudes = Object.values(Aptitude);
export const AptitudeName = {
  [Aptitude.S]: 'S',
  [Aptitude.A]: 'A',
  [Aptitude.B]: 'B',
  [Aptitude.C]: 'C',
  [Aptitude.D]: 'D',
  [Aptitude.E]: 'E',
  [Aptitude.F]: 'F',
  [Aptitude.G]: 'G',
} as const;

export const Strategy = {
  FrontRunner: 1,
  PaceChaser: 2,
  LateSurger: 3,
  EndCloser: 4,
  Runaway: 5,
} as const;
export type IStrategy = (typeof Strategy)[keyof typeof Strategy];
export const strategies = Object.values(Strategy);
export const StrategyName = {
  [Strategy.FrontRunner]: 'Front Runner',
  [Strategy.PaceChaser]: 'Pace Chaser',
  [Strategy.LateSurger]: 'Late Surger',
  [Strategy.EndCloser]: 'End Closer',
  [Strategy.Runaway]: 'Runaway',
} as const;
export type IStrategyName = (typeof StrategyName)[keyof typeof StrategyName];
export const strategyNames = Object.values(StrategyName);
