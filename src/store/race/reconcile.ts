import { usePresetStore } from './preset.store';
import { useSettingsStore } from '@/store/settings.store';

/**
 * Cross-validate preset and settings stores after both have hydrated from localStorage.
 * Call once at app startup (e.g. in main.tsx).
 *
 * - Clears selectedPresetId if it references a preset that no longer exists.
 */
export function reconcileStoresAfterHydration() {
  clearSelectedPresetIfInvalid();
}

/**
 * Clear selectedPresetId from settings if it references a preset that no longer exists.
 * Called at startup and after preset resets/deletions.
 */
function clearSelectedPresetIfInvalid() {
  const presets = usePresetStore.getState().presets;
  const selectedPresetId = useSettingsStore.getState().selectedPresetId;

  if (selectedPresetId && !presets[selectedPresetId]) {
    useSettingsStore.setState({ selectedPresetId: null });
  }
}
