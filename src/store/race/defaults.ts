import type { RacePreset } from '@/utils/races';
import cmPresets from './cm-presets.json';

/**
 * Resolve the default course ID from bundled presets based on the current date.
 * Pure function — no store access, safe to call at module scope.
 */
export function getDefaultCourseId(): number {
  const presets = cmPresets as Array<RacePreset>;
  const now = new Date();

  const idx =
    presets.findIndex((p) => {
      const d = new Date(p.date);
      return new Date(d.getFullYear(), d.getMonth() + 1, 0) < now;
    }) - 1;

  return presets[Math.max(idx, 0)].courseId;
}
