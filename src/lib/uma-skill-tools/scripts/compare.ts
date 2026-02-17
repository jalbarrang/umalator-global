import { PosKeepMode } from '../sim/RaceSolver';
import {
  Perspective,
  RaceSolverBuilder,
  buildAdjustedStats,
  buildBaseStats,
} from '../sim/RaceSolverBuilder';

import { Rule30CARng } from '../sim/Random';
import type { HorseDesc } from '../sim/RaceSolverBuilder';
import type { HorseParameters } from '../sim/HorseTypes';
import type { HorseState } from '../components/HorseDefTypes';
import type { PositionKeepState, RaceSolver } from '../sim/RaceSolver';
import type { RaceParameters } from '../sim/RaceParameters';
import type { CourseData } from '../sim/CourseData';
import skillsMeta from '@/modules/data/skill_meta.json';

export type SkillActivationMap = Map<string, Array<[number, number]>>;

export type CompareRunData = {
  t: [Array<number>, Array<number>];
  p: [Array<number>, Array<number>];
  v: [Array<number>, Array<number>];
  hp: [Array<number>, Array<number>];
  currentLane: [Array<number>, Array<number>];
  pacerGap: [Array<number>, Array<number>];
  sk: [SkillActivationMap, SkillActivationMap];
  sdly: [number, number];
  rushed: [Array<[number, number]>, Array<[number, number]>];
  posKeep: [Array<[number, number, PositionKeepState]>, Array<[number, number, PositionKeepState]>];
  competeFight: [Array<number>, Array<number>];
  leadCompetition: [Array<number>, Array<number>];
  downhillActivations: [Array<[number, number]>, Array<[number, number]>];
  pacerV: [Array<number>, Array<number>, Array<number>];
  pacerP: [Array<number>, Array<number>, Array<number>];
  pacerT: [Array<number>, Array<number>, Array<number>];
  pacerPosKeep: [
    Array<[number, number, PositionKeepState]>,
    Array<[number, number, PositionKeepState]>,
    Array<[number, number, PositionKeepState]>,
  ];
  pacerLeadCompetition: [Array<number>, Array<number>, Array<number>];
};

type RushedStat = {
  lengths: Array<number>;
  count: number;
};

export type CompareOptions = {
  pacemakerCount: number;
  seed: number;
  posKeepMode: PosKeepMode;
  mode: 'compare' | 'skill-compare';
  syncRng: boolean;
  skillWisdomCheck: boolean;
  rushedKakari: boolean;
  competeFight: boolean;
  duelingRates: {
    runaway: number;
    frontRunner: number;
    paceChaser: number;
    lateSurger: number;
    endCloser: number;
  };
  leadCompetition: boolean;
  laneMovement: boolean;
};

type CompareRunner = Omit<HorseState, 'skills'> & {
  skills: Array<string>;
};

export function runComparison(
  nsamples: number,
  course: CourseData,
  racedef: RaceParameters,
  uma1: HorseState,
  uma2: HorseState,
  pacer: HorseState,
  options: CompareOptions,
) {
  const standard = new RaceSolverBuilder(nsamples)
    .seed(options.seed)
    .course(course)
    .ground(racedef.groundCondition)
    .weather(racedef.weather)
    .season(racedef.season)
    .time(racedef.time)
    .posKeepMode(options.posKeepMode)
    .mode(options.mode);

  if (racedef.orderRange != null) {
    standard.order(racedef.orderRange[0], racedef.orderRange[1]).numUmas(racedef.numUmas);
  }

  // Fork to share RNG - both horses face the same random events for fair comparison
  const compare = standard.fork();

  if (options.mode === 'compare' && !options.syncRng) {
    standard.desync();
  }

  // Convert skills from a Map to an Array
  const uma1_ = uma1
    // @ts-expect-error - We forcefully convert the skills to an array
    .update('skills', (sk): Array<string> => {
      return Array.from(sk.values());
    })
    .toJS() as CompareRunner;
  const uma2_ = uma2
    // @ts-expect-error - We forcefully convert the skills to an array
    .update('skills', (sk): Array<string> => {
      return Array.from(sk.values());
    })
    .toJS() as CompareRunner;

  standard.horse(uma1_);
  compare.horse(uma2_);

  if (options.skillWisdomCheck === false) {
    standard.skillWisdomCheck(false);
    compare.skillWisdomCheck(false);
  }

  if (options.rushedKakari === false) {
    standard.rushedKakari(false);
    compare.rushedKakari(false);
  }

  if (options.competeFight) {
    standard.competeFight(options.competeFight);
    compare.competeFight(options.competeFight);
  }

  if (options.duelingRates) {
    standard.duelingRates(options.duelingRates);
    compare.duelingRates(options.duelingRates);
  }

  if (options.leadCompetition) {
    standard.leadCompetition(options.leadCompetition);
    compare.leadCompetition(options.leadCompetition);
  }

  if (options.laneMovement) {
    standard.laneMovement(options.laneMovement);
    compare.laneMovement(options.laneMovement);
  }

  // ensure skills common to the two umas are added in the same order regardless of what additional skills they have
  // this is important to make sure the rng for their activations is synced
  // sort first by groupId so that white and gold versions of a skill get added in the same order
  const common = uma1.skills
    .keySeq()
    .toSet()
    .intersect(uma2.skills.keySeq().toSet())
    .toArray()
    .sort((a, b) => +a - +b);

  const commonIdx = (id: string) => {
    const groupId = skillsMeta[id as keyof typeof skillsMeta].groupId;
    const i = common.indexOf(`${groupId}`);

    return i > -1 ? i : common.length;
  };

  const sort = (a: string, b: string) => commonIdx(a) - commonIdx(b) || +a - +b;

  const uma1Horse = uma1.toJS() as HorseDesc;
  const uma1BaseStats = buildBaseStats(uma1Horse, uma1Horse.mood);
  const uma1AdjustedStats = buildAdjustedStats(uma1BaseStats, course, racedef.groundCondition);
  const uma1Wisdom = uma1AdjustedStats.wisdom;

  const uma2Horse = uma2.toJS() as HorseDesc;
  const uma2BaseStats = buildBaseStats(uma2Horse, uma2Horse.mood);
  const uma2AdjustedStats = buildAdjustedStats(uma2BaseStats, course, racedef.groundCondition);
  const uma2Wisdom = uma2AdjustedStats.wisdom;

  uma1_.skills.sort(sort).forEach((id) => {
    const forcedPos = uma1.forcedSkillPositions.get(id);
    if (forcedPos != null) {
      standard.addSkillAtPosition(id, forcedPos, Perspective.Self);
    } else {
      standard.addSkill(id, Perspective.Self);
    }
  });

  uma2_.skills.sort(sort).forEach((id) => {
    const forcedPos = uma2.forcedSkillPositions.get(id);
    if (forcedPos != null) {
      compare.addSkillAtPosition(id, forcedPos, Perspective.Self);
    } else {
      compare.addSkill(id, Perspective.Self);
    }
  });

  uma1_.skills.forEach((id) => {
    const forcedPos = uma1.forcedSkillPositions.get(id);
    if (forcedPos != null) {
      compare.addSkillAtPosition(id, forcedPos, Perspective.Other, uma1Wisdom);
    } else {
      compare.addSkill(id, Perspective.Other, undefined, uma1Wisdom);
    }
  });

  uma2_.skills.forEach((id) => {
    const forcedPos = uma2.forcedSkillPositions.get(id);
    if (forcedPos != null) {
      standard.addSkillAtPosition(id, forcedPos, Perspective.Other, uma2Wisdom);
    } else {
      standard.addSkill(id, Perspective.Other, undefined, uma2Wisdom);
    }
  });

  let pacerHorse: HorseParameters | null = null;

  if (options.posKeepMode === PosKeepMode.Approximate) {
    pacerHorse = standard.useDefaultPacer(true);
  } else if (options.posKeepMode === PosKeepMode.Virtual) {
    if (pacer) {
      // @ts-expect-error - We forcefully convert the skills to an array
      const pacer_ = pacer.update('skills', (sk) => Array.from(sk.values())).toJS() as HorseDesc;
      pacerHorse = standard.pacer(pacer_);
    } else {
      pacerHorse = standard.useDefaultPacer();
    }
  }

  const skillPos1: Map<string, Array<[number, number]>> = new Map();
  const skillPos2: Map<string, Array<[number, number]>> = new Map();

  function getActivator(skillSet: Map<string, Array<[number, number]>>) {
    return function (s: RaceSolver, id: string, persp: Perspective) {
      if (persp == Perspective.Self && id != 'asitame' && id != 'staminasyoubu') {
        const skillSetValue = skillSet.get(id) ?? [];
        skillSetValue.push([s.pos, -1]);
        skillSet.set(id, skillSetValue);
      }
    };
  }

  function getDeactivator(skillSet: Map<string, Array<[number, number]>>) {
    return function (s: RaceSolver, id: string, persp: Perspective) {
      if (persp == Perspective.Self && id != 'asitame' && id != 'staminasyoubu') {
        const ar = skillSet.get(id) ?? []; // activation record
        // in the case of adding multiple copies of speed debuffs a skill can activate again before the first
        // activation has finished (as each copy has the same ID), so we can't just access a specific index
        // (-1).
        // assume that multiple activations of a skill always deactivate in the same order (probably true?) so
        // just seach for the first record that hasn't had its deactivation location filled out yet.
        const r = ar.find((x) => x[1] == -1);
        // onSkillDeactivate gets called twice for skills that have both speed and accel components, so the end
        // position could already have been filled out and r will be undefined
        if (r != null) r[1] = Math.min(s.pos, course.distance);
      }
    };
  }

  standard.onSkillActivate(getActivator(skillPos1));
  standard.onSkillDeactivate(getDeactivator(skillPos1));
  compare.onSkillActivate(getActivator(skillPos2));
  compare.onSkillDeactivate(getDeactivator(skillPos2));

  const a = standard.build();
  const b = compare.build();

  const ai = 1;
  const bi = 0;
  const sign = 1;
  const diff = [];

  // ===============================================
  // Track statistics
  // ===============================================

  let min = Infinity;
  let max = -Infinity;
  let estMean = 0;
  let estMedian = 0;
  let bestMeanDiff = Infinity;
  let bestMedianDiff = Infinity;

  let minrun: CompareRunData | null = null;
  let maxrun: CompareRunData | null = null;
  let meanrun: CompareRunData | null = null;
  let medianrun: CompareRunData | null = null;

  // ===============================================
  // Track skill activations
  // ===============================================

  const allSkillActivations = [new Map<string, Array<number>>(), new Map<string, Array<number>>()];
  const allSkillActivationBasinn = [
    new Map<string, Array<[number, number]>>(),
    new Map<string, Array<[number, number]>>(),
  ];
  const sampleCutoff = Math.max(Math.floor(nsamples * 0.8), nsamples - 200);
  let retry = false;

  // Track rushed statistics across all simulations
  const rushedStats: { uma1: RushedStat; uma2: RushedStat } = {
    uma1: { lengths: [], count: 0 },
    uma2: { lengths: [], count: 0 },
  };

  const leadCompetitionStats: { uma1: RushedStat; uma2: RushedStat } = {
    uma1: { lengths: [], count: 0 },
    uma2: { lengths: [], count: 0 },
  };

  const competeFightStats: { uma1: RushedStat; uma2: RushedStat } = {
    uma1: { lengths: [], count: 0 },
    uma2: { lengths: [], count: 0 },
  };

  // Track stamina survival and full spurt statistics
  const staminaStats = {
    uma1: {
      hpDiedCount: 0,
      fullSpurtCount: 0,
      total: 0,
      hpDiedPositionsFullSpurt: [] as Array<number>,
      hpDiedPositionsNonFullSpurt: [] as Array<number>,
      nonFullSpurtVelocityDiffs: [] as Array<number>,
      nonFullSpurtDelayDistances: [] as Array<number>,
    },
    uma2: {
      hpDiedCount: 0,
      fullSpurtCount: 0,
      total: 0,
      hpDiedPositionsFullSpurt: [] as Array<number>,
      hpDiedPositionsNonFullSpurt: [] as Array<number>,
      nonFullSpurtVelocityDiffs: [] as Array<number>,
      nonFullSpurtDelayDistances: [] as Array<number>,
    },
  };

  // Track last spurt 1st place frequency
  // This is primarily useful for front runners where we want to evaluate how effective
  // they are at getting angling & scheming
  //
  // note: eventually we could also even limit angling & scheming proc to only occur
  // when the uma is *actually* 1st place in the sim instead of using a probability estimate?
  const firstUmaStats = {
    uma1: { firstPlaceCount: 0, total: 0 },
    uma2: { firstPlaceCount: 0, total: 0 },
  };

  const basePacerRng = new Rule30CARng(options.seed + 1);

  for (let i = 0; i < nsamples; ++i) {
    const pacers: Array<RaceSolver> = [];

    for (let j = 0; j < options.pacemakerCount; ++j) {
      if (pacerHorse == null) continue;

      const pacerRng = new Rule30CARng(basePacerRng.int32());
      const builtPacer = standard.buildPacer(pacerHorse, i, pacerRng);

      if (builtPacer == null) continue;
      pacers.push(builtPacer);
    }

    const selectedPacer: RaceSolver | null = pacers.length > 0 ? pacers[0] : null;

    const s1 = a.next(retry).value as RaceSolver;
    const s2 = b.next(retry).value as RaceSolver;

    const data: CompareRunData = {
      t: [[], []],
      p: [[], []],
      v: [[], []],
      hp: [[], []],
      currentLane: [[], []],
      pacerGap: [[], []],
      sk: [new Map(), new Map()],
      sdly: [0, 0],
      rushed: [[], []],
      posKeep: [[], []],
      competeFight: [[], []],
      leadCompetition: [[], []],
      downhillActivations: [[], []],
      pacerV: [[], [], []],
      pacerP: [[], [], []],
      pacerT: [[], [], []],
      pacerPosKeep: [[], [], []],
      pacerLeadCompetition: [[], [], []],
    };

    s1.initUmas([s2, ...pacers]);
    s2.initUmas([s1, ...pacers]);

    pacers.forEach((p) => {
      p?.initUmas([s1, s2, ...pacers.filter((p2) => p2 !== p)]);
    });

    let s1Finished = false;
    let s2Finished = false;
    let posDifference = 0;

    const updatePacer = (newPacer: RaceSolver | null) => {
      if (newPacer == null) return;

      newPacer.umas.forEach((u) => {
        u.updatePacer(newPacer);
      });
    };

    while (!s1Finished || !s2Finished) {
      let currentPacer: RaceSolver | null = null;

      if (selectedPacer) {
        currentPacer = selectedPacer.getPacer();
        updatePacer(currentPacer);
      }

      if (s2.pos < course.distance) {
        if (currentPacer) {
          data.pacerGap[ai].push(currentPacer.pos - s2.pos);
        }
      }
      if (s1.pos < course.distance) {
        if (currentPacer) {
          data.pacerGap[bi].push(currentPacer.pos - s1.pos);
        }
      }

      for (let j = 0; j < options.pacemakerCount; j++) {
        const p = j < pacers.length ? pacers[j] : null;
        if (p == null || p.pos >= course.distance) continue;
        p.step(1 / 15);

        if (p) {
          data.pacerV[j].push(
            p.currentSpeed + (p.modifiers.currentSpeed.acc + p.modifiers.currentSpeed.err),
          );
          data.pacerP[j].push(p.pos);
          data.pacerT[j].push(p.accumulatetime.t);
        }
      }

      if (s2.pos < course.distance) {
        s2.step(1 / 15);

        data.t[ai].push(s2.accumulatetime.t);
        data.p[ai].push(s2.pos);
        data.v[ai].push(
          s2.currentSpeed + (s2.modifiers.currentSpeed.acc + s2.modifiers.currentSpeed.err),
        );
        data.hp[ai].push((s2.hp as any).hp);
        data.currentLane[ai].push(s2.currentLane);
      } else if (!s2Finished) {
        s2Finished = true;

        data.sdly[ai] = s2.startDelay;
        data.rushed[ai] = s2.rushedActivations.slice();
        data.posKeep[ai] = s2.positionKeepActivations.slice();
        data.downhillActivations[ai] = s2.downhillActivations.slice();
        if (s2.competeFightStart != null) {
          data.competeFight[ai] = [
            s2.competeFightStart,
            s2.competeFightEnd != null ? s2.competeFightEnd : course.distance,
          ];
        }
        if (s2.leadCompetitionStart != null) {
          data.leadCompetition[ai] = [
            s2.leadCompetitionStart,
            s2.leadCompetitionEnd != null ? s2.leadCompetitionEnd : course.distance,
          ];
        }
      }

      if (s1.pos < course.distance) {
        s1.step(1 / 15);

        data.t[bi].push(s1.accumulatetime.t);
        data.p[bi].push(s1.pos);
        data.v[bi].push(
          s1.currentSpeed + (s1.modifiers.currentSpeed.acc + s1.modifiers.currentSpeed.err),
        );
        data.hp[bi].push((s1.hp as any).hp);
        data.currentLane[bi].push(s1.currentLane);
      } else if (!s1Finished) {
        s1Finished = true;

        data.sdly[bi] = s1.startDelay;
        data.rushed[bi] = s1.rushedActivations.slice();
        data.posKeep[bi] = s1.positionKeepActivations.slice();
        data.downhillActivations[bi] = s1.downhillActivations.slice();
        if (s1.competeFightStart != null) {
          data.competeFight[bi] = [
            s1.competeFightStart,
            s1.competeFightEnd != null ? s1.competeFightEnd : course.distance,
          ];
        }
        if (s1.leadCompetitionStart != null) {
          data.leadCompetition[bi] = [
            s1.leadCompetitionStart,
            s1.leadCompetitionEnd != null ? s1.leadCompetitionEnd : course.distance,
          ];
        }
      }

      s2.updatefirstUmaInLateRace();
    }

    s2.cleanup();
    s1.cleanup();

    // ai took less time to finish (less frames to finish)
    if (data.p[ai].length <= data.p[bi].length) {
      const aiFrames = data.p[ai].length;
      posDifference = data.p[ai][aiFrames - 1] - data.p[bi][aiFrames - 1];
    } else {
      const biFrames = data.p[bi].length;
      posDifference = data.p[ai][biFrames - 1] - data.p[bi][biFrames - 1];
    }

    pacers.forEach((p) => {
      // Skip if pacer is null
      if (p == null) return;
      // Skip if pacer has finished the race
      if (p.pos >= course.distance) return;

      // Step pacer
      p.step(1 / 15);

      for (let pacemakerIndex = 0; pacemakerIndex < 3; pacemakerIndex++) {
        if (pacemakerIndex < pacers.length && pacers[pacemakerIndex] === p) {
          data.pacerV[pacemakerIndex].push(
            p.currentSpeed + (p.modifiers.currentSpeed.acc + p.modifiers.currentSpeed.err),
          );
          data.pacerP[pacemakerIndex].push(p.pos);
          data.pacerT[pacemakerIndex].push(p.accumulatetime.t);
        }
      }
    });

    for (let j = 0; j < options.pacemakerCount; j++) {
      const p = j < pacers.length ? pacers[j] : null;
      data.pacerPosKeep[j] = p ? p.positionKeepActivations.slice() : [];
      if (p && p.leadCompetitionStart != null) {
        data.pacerLeadCompetition[j] = [
          p.leadCompetitionStart,
          p.leadCompetitionEnd != null ? p.leadCompetitionEnd : course.distance,
        ];
      } else {
        data.pacerLeadCompetition[j] = [];
      }
    }

    data.sk[1] = new Map(skillPos2); // NOT ai (NB. why not?)
    data.sk[0] = new Map(skillPos1); // NOT bi (NB. why not?)

    const runSkillActivations: Array<{ skillId: string; activationPos: number; umaIndex: number }> =
      [];

    skillPos1.forEach((positions, skillId) => {
      if (!allSkillActivations[0].has(skillId)) {
        allSkillActivations[0].set(skillId, []);
      }
      positions.forEach((pos) => {
        if (Array.isArray(pos) && pos.length >= 1 && typeof pos[0] === 'number') {
          const activationPos = pos[0];
          allSkillActivations[0].get(skillId)!.push(activationPos);
          runSkillActivations.push({ skillId, activationPos, umaIndex: 0 });
        }
      });
    });

    skillPos2.forEach((positions, skillId) => {
      if (!allSkillActivations[1].has(skillId)) {
        allSkillActivations[1].set(skillId, []);
      }
      positions.forEach((pos) => {
        if (Array.isArray(pos) && pos.length >= 1 && typeof pos[0] === 'number') {
          const activationPos = pos[0];
          allSkillActivations[1].get(skillId)!.push(activationPos);
          runSkillActivations.push({ skillId, activationPos, umaIndex: 1 });
        }
      });
    });

    skillPos2.clear();
    skillPos1.clear();

    retry = false;

    const trackSolverStats = (solver: RaceSolver, isUma1: boolean) => {
      const staminaStat = isUma1 ? staminaStats.uma1 : staminaStats.uma2;
      staminaStat.total++;

      if (solver.hpDied) {
        staminaStat.hpDiedCount++;
        if (solver.hpDiedPosition != null) {
          if (solver.fullSpurt) {
            staminaStat.hpDiedPositionsFullSpurt.push(solver.hpDiedPosition);
          } else {
            staminaStat.hpDiedPositionsNonFullSpurt.push(solver.hpDiedPosition);
          }
        }
      }

      if (solver.fullSpurt) {
        staminaStat.fullSpurtCount++;
      } else {
        if (solver.nonFullSpurtVelocityDiff != null) {
          staminaStat.nonFullSpurtVelocityDiffs.push(solver.nonFullSpurtVelocityDiff);
        }
        if (solver.nonFullSpurtDelayDistance != null) {
          staminaStat.nonFullSpurtDelayDistances.push(solver.nonFullSpurtDelayDistance);
        }
      }

      const firstUmaStat = isUma1 ? firstUmaStats.uma1 : firstUmaStats.uma2;
      firstUmaStat.total++;
      if (solver.firstUmaInLateRace) {
        firstUmaStat.firstPlaceCount++;
      }

      if (solver.rushedActivations.length > 0) {
        const [start, end] = solver.rushedActivations[0];
        const length = end - start;
        const rushedStat = isUma1 ? rushedStats.uma1 : rushedStats.uma2;
        rushedStat.lengths.push(length);
        rushedStat.count++;
      }

      if (solver.leadCompetitionStart != null) {
        const start = solver.leadCompetitionStart;
        const end = solver.leadCompetitionEnd != null ? solver.leadCompetitionEnd : course.distance;
        const length = end - start;
        const leadCompStat = isUma1 ? leadCompetitionStats.uma1 : leadCompetitionStats.uma2;
        leadCompStat.lengths.push(length);
        leadCompStat.count++;
      }

      if (solver.competeFightStart != null) {
        const start = solver.competeFightStart;
        const end = solver.competeFightEnd != null ? solver.competeFightEnd : course.distance;
        const length = end - start;
        const competeFightStat = isUma1 ? competeFightStats.uma1 : competeFightStats.uma2;
        competeFightStat.lengths.push(length);
        competeFightStat.count++;
      }
    };

    trackSolverStats(s1, true);
    trackSolverStats(s2, false);

    const basinn = (sign * posDifference) / 2.5;
    diff.push(basinn);

    runSkillActivations.forEach(({ skillId, activationPos, umaIndex }) => {
      if (!allSkillActivationBasinn[umaIndex].has(skillId)) {
        allSkillActivationBasinn[umaIndex].set(skillId, []);
      }
      allSkillActivationBasinn[umaIndex].get(skillId)!.push([activationPos, basinn]);
    });

    if (basinn < min) {
      min = basinn;
      minrun = data;
    }

    if (basinn > max) {
      max = basinn;
      maxrun = data;
    }

    if (i == sampleCutoff) {
      // eslint-disable-next-line no-shadow
      diff.sort((a, b) => a - b);
      // eslint-disable-next-line no-shadow
      estMean = diff.reduce((a, b) => a + b) / diff.length;
      const mid = Math.floor(diff.length / 2);
      estMedian = mid > 0 && diff.length % 2 == 0 ? (diff[mid - 1] + diff[mid]) / 2 : diff[mid];
    }

    if (i >= sampleCutoff) {
      const meanDiff = Math.abs(basinn - estMean),
        medianDiff = Math.abs(basinn - estMedian);
      if (meanDiff < bestMeanDiff) {
        bestMeanDiff = meanDiff;
        meanrun = data;
      }
      if (medianDiff < bestMedianDiff) {
        bestMedianDiff = medianDiff;
        medianrun = data;
      }
    }
  }

  // eslint-disable-next-line no-shadow
  diff.sort((a, b) => a - b);

  // Calculate rushed statistics
  const calculateStats = (stats: RushedStat) => {
    if (stats.lengths.length === 0) {
      return { min: 0, max: 0, mean: 0, frequency: 0 };
    }

    const minBashin = Math.min(...stats.lengths);
    const maxBashin = Math.max(...stats.lengths);
    // eslint-disable-next-line no-shadow
    const mean = stats.lengths.reduce((a, b) => a + b, 0) / stats.lengths.length;

    const frequency = (stats.count / nsamples) * 100; // percentage
    return { min: minBashin, max: maxBashin, mean, frequency };
  };

  const rushedStatsSummary = {
    uma1: calculateStats(rushedStats.uma1),
    uma2: calculateStats(rushedStats.uma2),
  };

  const leadCompetitionStatsSummary = {
    uma1: calculateStats(leadCompetitionStats.uma1),
    uma2: calculateStats(leadCompetitionStats.uma2),
  };

  const competeFightStatsSummary = {
    uma1: calculateStats(competeFightStats.uma1),
    uma2: calculateStats(competeFightStats.uma2),
  };

  const calculateHpDiedPositionStats = (positions: Array<number>) => {
    if (positions.length === 0) {
      return { count: 0, min: null, max: null, mean: null, median: null };
    }

    // eslint-disable-next-line no-shadow
    const sorted = [...positions].sort((a, b) => a - b);

    const minPosition = sorted[0];
    const maxPosition = sorted[sorted.length - 1];

    // eslint-disable-next-line no-shadow
    const mean = positions.reduce((a, b) => a + b, 0) / positions.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

    return { count: positions.length, min: minPosition, max: maxPosition, mean, median };
  };

  // Calculate stamina survival and full spurt rates
  const staminaStatsSummary = {
    uma1: {
      staminaSurvivalRate:
        staminaStats.uma1.total > 0
          ? ((staminaStats.uma1.total - staminaStats.uma1.hpDiedCount) / staminaStats.uma1.total) *
            100
          : 0,
      fullSpurtRate:
        staminaStats.uma1.total > 0
          ? (staminaStats.uma1.fullSpurtCount / staminaStats.uma1.total) * 100
          : 0,
      hpDiedPositionStatsFullSpurt: calculateHpDiedPositionStats(
        staminaStats.uma1.hpDiedPositionsFullSpurt,
      ),
      hpDiedPositionStatsNonFullSpurt: calculateHpDiedPositionStats(
        staminaStats.uma1.hpDiedPositionsNonFullSpurt,
      ),
      nonFullSpurtVelocityStats: calculateHpDiedPositionStats(
        staminaStats.uma1.nonFullSpurtVelocityDiffs,
      ),
      nonFullSpurtDelayStats: calculateHpDiedPositionStats(
        staminaStats.uma1.nonFullSpurtDelayDistances,
      ),
    },
    uma2: {
      staminaSurvivalRate:
        staminaStats.uma2.total > 0
          ? ((staminaStats.uma2.total - staminaStats.uma2.hpDiedCount) / staminaStats.uma2.total) *
            100
          : 0,
      fullSpurtRate:
        staminaStats.uma2.total > 0
          ? (staminaStats.uma2.fullSpurtCount / staminaStats.uma2.total) * 100
          : 0,
      hpDiedPositionStatsFullSpurt: calculateHpDiedPositionStats(
        staminaStats.uma2.hpDiedPositionsFullSpurt,
      ),
      hpDiedPositionStatsNonFullSpurt: calculateHpDiedPositionStats(
        staminaStats.uma2.hpDiedPositionsNonFullSpurt,
      ),
      nonFullSpurtVelocityStats: calculateHpDiedPositionStats(
        staminaStats.uma2.nonFullSpurtVelocityDiffs,
      ),
      nonFullSpurtDelayStats: calculateHpDiedPositionStats(
        staminaStats.uma2.nonFullSpurtDelayDistances,
      ),
    },
  };

  const firstUmaStatsSummary = {
    uma1: {
      firstPlaceRate:
        firstUmaStats.uma1.total > 0
          ? (firstUmaStats.uma1.firstPlaceCount / firstUmaStats.uma1.total) * 100
          : 0,
    },
    uma2: {
      firstPlaceRate:
        firstUmaStats.uma2.total > 0
          ? (firstUmaStats.uma2.firstPlaceCount / firstUmaStats.uma2.total) * 100
          : 0,
    },
  };

  // Each run (min, max, mean, median) already has its own rushed data from its actual simulation
  // We don't need to overwrite it - just ensure the rushed field is properly formatted
  // The rushed data comes from the RaceSolver.rushedActivations collected during each specific run

  const allRunsData = {
    sk: [allSkillActivations[0], allSkillActivations[1]],
    skBasinn: [allSkillActivationBasinn[0], allSkillActivationBasinn[1]],
    totalRuns: nsamples,
    rushed: [rushedStatsSummary.uma1, rushedStatsSummary.uma2],
    leadCompetition: [leadCompetitionStatsSummary.uma1, leadCompetitionStatsSummary.uma2],
    competeFight: [competeFightStatsSummary.uma1, competeFightStatsSummary.uma2],
  };

  return {
    results: diff,
    runData: {
      minrun,
      maxrun,
      meanrun,
      medianrun,
      allruns: allRunsData,
    },
    staminaStats: staminaStatsSummary,
    firstUmaStats: firstUmaStatsSummary,
  };
}
