/**
 * Web Worker for running simulations
 */

import type { CourseData } from '@/modules/simulation/lib/courses/types';
import type { RaceParameters } from '@simulation/lib/RaceParameters';

import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { Run1RoundParams, SimulationOptions } from '@/modules/simulation/types';
import { mergeResultSets } from '@/workers/utils';
import { run1Round } from '@/utils/compare';

type RunChartParams = {
  skills: string[];
  course: CourseData;
  racedef: RaceParameters;
  uma: RunnerState;
  pacer: RunnerState;
  options: SimulationOptions;
};

function runChart(params: RunChartParams) {
  const { skills, course, racedef, uma, pacer, options } = params;

  const optionsWithoutRunData = { ...options, includeRunData: false };

  let newSkills = [...skills];

  const uma_ = {
    ...uma,
    skills: [...uma.skills],
    forcedSkillPositions: { ...uma.forcedSkillPositions },
  };

  let pacer_: RunnerState | null = null;

  if (pacer) {
    pacer_ = {
      ...pacer,
      skills: [...pacer.skills],
      forcedSkillPositions: { ...pacer.forcedSkillPositions },
    };
  }

  const roundParams: Run1RoundParams = {
    nsamples: 5,
    skills: newSkills,
    course,
    racedef,
    uma: uma_,
    pacer: pacer_,
    options,
  };

  const results = run1Round(roundParams);

  postMessage({ type: 'skill-bassin', results });

  // Stage 1 filter: mark skills with negligible effect
  newSkills = newSkills.filter((id) => {
    const result = results.get(id);
    if (result && result.max <= 0.1) {
      result.filterReason = 'negligible-effect';
      return false;
    }
    return true;
  });

  let update = run1Round({
    nsamples: 20,
    skills: newSkills,
    course,
    racedef,
    uma: uma_,
    pacer: pacer_,
    options: optionsWithoutRunData,
  });

  mergeResultSets(results, update);
  postMessage({ type: 'skill-bassin', results });

  // Stage 2 filter: mark skills with low variance
  newSkills = newSkills.filter((id) => {
    const result = results.get(id);
    if (result && Math.abs(result.max - result.min) <= 0.1) {
      result.filterReason = 'low-variance';
      return false;
    }
    return true;
  });

  update = run1Round({
    nsamples: 50,
    skills: newSkills,
    course,
    racedef,
    uma: uma_,
    pacer: pacer_,
    options: optionsWithoutRunData,
  });
  mergeResultSets(results, update);
  postMessage({ type: 'skill-bassin', results });

  update = run1Round({
    nsamples: 200,
    skills: newSkills,
    course,
    racedef,
    uma: uma_,
    pacer: pacer_,
    options,
  });

  mergeResultSets(results, update);

  postMessage({ type: 'skill-bassin', results });
  postMessage({ type: 'skill-bassin-done' });
}

self.addEventListener('message', (e: MessageEvent) => {
  const { msg, data } = e.data;

  switch (msg) {
    case 'chart':
      runChart(data);
      break;
  }
});
