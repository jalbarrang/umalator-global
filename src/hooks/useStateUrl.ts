import { useCallback } from 'react';
import { useRunnersStore } from '@/store/runners.store';
import { getWitVariance, useSettingsStore } from '@/store/settings.store';
import { getSelectedPacemakersAsArray } from '@/store/settings/actions';
import { serialize } from '@/utils/storage';

export function useStateUrl() {
  const copyStateUrl = useCallback(async (e: Event) => {
    e.preventDefault();

    const { uma1, uma2, pacer } = useRunnersStore.getState();
    const {
      racedef,
      nsamples,
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
    } = getWitVariance();

    const hash = await serialize(
      courseId,
      nsamples,
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

    const url = window.location.protocol + '//' + window.location.host + window.location.pathname;

    window.navigator.clipboard.writeText(url + '#' + hash);
  }, []);

  return { copyStateUrl };
}
