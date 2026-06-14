import type { RaceRoomModelSpec } from './types';

/**
 * Ported room-winner prediction models. Each model is course-specific.
 * Source: Hakuraku (https://github.com/SSHZ-ORG/hakuraku, MIT) — see provenance
 * note in `data/race-prediction/README.md`.
 */
const ROOM_MODEL_REGISTRY: RaceRoomModelSpec[] = [
  {
    id: 'cm14',
    label: 'CM14 room winner model',
    courseId: 10602,
    artifactPath: 'data/race-prediction/cm14-room-model.json.gz',
    teamCount: 3,
    horsesPerTeam: 3
  }
];

export function getRaceRoomModelForCourse(courseId: number | undefined): RaceRoomModelSpec | null {
  if (courseId === undefined) {
    return null;
  }
  return ROOM_MODEL_REGISTRY.find((model) => model.courseId === courseId) ?? null;
}

export function listRaceRoomModels(): RaceRoomModelSpec[] {
  return ROOM_MODEL_REGISTRY.slice();
}
