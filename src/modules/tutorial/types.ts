import type { DriveStep } from 'driver.js';

export type { DriveStep };

export type TutorialId = 'umalator' | 'skill-bassin' | 'uma-bassin';

export interface TutorialConfig {
  id: TutorialId;
  name: string;
  steps: DriveStep[];
}
