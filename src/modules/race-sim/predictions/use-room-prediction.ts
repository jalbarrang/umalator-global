import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useSettingsStore } from '@/store/settings.store';
import { useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import { getSupportedRaceRoomModel, predictRaceRoomForRunners } from './index';
import type { RaceRoomPrediction } from './types';

type PredictionState = {
  status: 'unsupported' | 'incompatible' | 'loading' | 'ready' | 'error';
  predictions: RaceRoomPrediction[];
  modelLabel?: string;
  error?: string;
};

const IDLE: PredictionState = { status: 'loading', predictions: [] };

export function useRoomPrediction(): PredictionState {
  const runners = useRaceSimStore(useShallow((state) => state.runners));
  const courseId = useSettingsStore((state) => state.courseId);
  const [state, setState] = useState<PredictionState>(IDLE);

  useEffect(() => {
    const model = getSupportedRaceRoomModel(courseId);
    if (!model) {
      setState({ status: 'unsupported', predictions: [] });
      return;
    }

    let cancelled = false;
    setState((prev) => ({ ...prev, status: 'loading' }));

    const handle = setTimeout(() => {
      predictRaceRoomForRunners(runners, courseId)
        .then((result) => {
          if (cancelled) return;
          if (!result) {
            // Model exists for the course, but the field isn't a valid room shape.
            setState({ status: 'incompatible', predictions: [], modelLabel: model.label });
            return;
          }
          setState({
            status: 'ready',
            predictions: result.predictions,
            modelLabel: model.label
          });
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          setState({
            status: 'error',
            predictions: [],
            error: error instanceof Error ? error.message : 'Prediction failed'
          });
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [runners, courseId]);

  return state;
}
