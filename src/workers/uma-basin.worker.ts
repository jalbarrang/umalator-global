/**
 * Web Worker for running simulations
 */

import type { CourseData } from '@simulation/lib/CourseData';
import type { RaceParameters } from '@simulation/lib/RaceParameters';

import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { run1Round } from '@/utils/compare';
import type { SimulationOptions } from '@/modules/simulation/types';
import { mergeResultSets } from '@/workers/utils';

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

  const optionsWithoutRunData = { ...options };

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

  const results = run1Round({
    nsamples: 5,
    skills: newSkills,
    course,
    racedef,
    uma: uma_,
    pacer: pacer_,
    options: optionsWithoutRunData,
  });

  postMessage({ type: 'uma-bassin', results });

  newSkills = newSkills.filter((id) => results.get(id).max > 0.1);

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

  postMessage({ type: 'uma-bassin', results });

  newSkills = newSkills.filter(
    (id) => Math.abs(results.get(id).max - results.get(id).min) > 0.1,
  );

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

  postMessage({ type: 'uma-bassin', results });

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

  postMessage({ type: 'uma-bassin', results });
  postMessage({ type: 'uma-bassin-done' });
}

self.addEventListener('message', (e: MessageEvent) => {
  const { msg, data } = e.data;

  switch (msg) {
    case 'chart':
      runChart(data);
      break;
  }
});
