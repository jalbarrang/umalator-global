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
