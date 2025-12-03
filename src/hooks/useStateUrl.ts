import { useRunnersStore } from '@/store/runners.store';
import { useSettingsStore, useWitVariance } from '@/store/settings.store';
import { getSelectedPacemakersAsArray } from '@/store/settings/actions';
import { serialize } from '@/utils/storage';
import { useCallback } from 'react';

export function useStateUrl() {
  const copyStateUrl = useCallback(async (e: Event) => {
    e.preventDefault();

    const { uma1, uma2, pacer } = useRunnersStore.getState();
    const {
      racedef,
      nsamples,
      seed,
      posKeepMode,
      pacemakerCount,
      showLanes,
      showVirtualPacemakerOnGraph,
      courseId,
    } = useSettingsStore.getState();
    const {
      allowRushedUma1,
      allowRushedUma2,
      allowDownhillUma1,
      allowDownhillUma2,
      allowSectionModifierUma1,
      allowSectionModifierUma2,
      allowSkillCheckChanceUma1,
      allowSkillCheckChanceUma2,
      simWitVariance,
    } = useWitVariance();

    const hash = await serialize(
      courseId,
      nsamples,
      seed,
      posKeepMode,
      racedef,
      uma1,
      uma2,
      pacer,
      showVirtualPacemakerOnGraph, // from UI store
      pacemakerCount,
      getSelectedPacemakersAsArray(),
      showLanes,
      {
        allowRushedUma1,
        allowRushedUma2,
        allowDownhillUma1,
        allowDownhillUma2,
        allowSectionModifierUma1,
        allowSectionModifierUma2,
        allowSkillCheckChanceUma1,
        allowSkillCheckChanceUma2,
        simWitVariance,
      },
    );

    const url =
      window.location.protocol +
      '//' +
      window.location.host +
      window.location.pathname;

    window.navigator.clipboard.writeText(url + '#' + hash);
  }, []);

  return { copyStateUrl };
}
