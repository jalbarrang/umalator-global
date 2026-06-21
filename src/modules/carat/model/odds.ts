export const RATEUP_P = 0.0075;
export const STEPUP_SLOT_P = 0.003;
export const PITY_PULLS = 200;
export const MLB_COPIES = 5;

export type CopiesOdds = {
  none: number;
  lb0: number;
  lb1: number;
  lb2: number;
  lb3: number;
  mlb: number;
};

export type CopiesOddsMode = 'standard' | 'stepup';

export type CopiesOddsInput = {
  pulls: number;
  p?: number;
  startingDupes?: number;
  mode?: CopiesOddsMode;
};

const LOG_SQRT_TWO_PI = 0.9189385332046727;
const LANCZOS_G = 7;
const LANCZOS_COEFFICIENTS = [
  0.9999999999998099,
  676.5203681218851,
  -1259.1392167224028,
  771.3234287776531,
  -176.6150291621406,
  12.507343278686905,
  -0.13857109526572012,
  0.000009984369578019572,
  0.00000015056327351493116
];

function normalizeCount(value: number) {
  return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}

function logGamma(value: number): number {
  if (value < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * value)) - logGamma(1 - value);
  }

  const z = value - 1;
  let x = LANCZOS_COEFFICIENTS[0];
  for (let index = 1; index < LANCZOS_COEFFICIENTS.length; index += 1) {
    x += LANCZOS_COEFFICIENTS[index] / (z + index);
  }

  const t = z + LANCZOS_G + 0.5;
  return LOG_SQRT_TWO_PI + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

function binomLogPmf(k: number, n: number, p: number) {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  if (p === 0) return k === 0 ? 0 : Number.NEGATIVE_INFINITY;
  if (p === 1) return k === n ? 0 : Number.NEGATIVE_INFINITY;

  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log1p(-p);
}

export function binomDist(k: number, n: number, p: number, cumulative: boolean): number {
  const trials = normalizeCount(n);
  const successes = Math.floor(k);

  if (successes < 0) return 0;
  if (successes > trials) return cumulative ? 1 : 0;
  if (p < 0 || p > 1 || !Number.isFinite(p)) return Number.NaN;

  if (!cumulative) return Math.exp(binomLogPmf(successes, trials, p));

  let total = 0;
  for (let current = 0; current <= successes; current += 1) {
    total += Math.exp(binomLogPmf(current, trials, p));
  }
  return Math.min(1, total);
}

export function binomPmf(k: number, n: number, p: number): number {
  return binomDist(k, n, p, false);
}

export function binomCdf(k: number, n: number, p: number): number {
  return binomDist(k, n, p, true);
}

function tierPmf(totalCopies: number, guaranteed: number, pulls: number, p: number) {
  return binomPmf(totalCopies - guaranteed, pulls, p);
}

// Confirmed by the live gacha_odds endpoint: total 3-star rate on a character
// banner is 3%, each rate-up (pickup) Uma is 0.75%, and the remainder is split
// across the off-banner 3-star pool.
export const TOTAL_3STAR_P = 0.03;
// "Less than 200 pulls" excludes the guaranteed spark at pull 200.
export const SUB_SPARK_PULLS = PITY_PULLS - 1;

function noneChance(p: number, pulls: number): number {
  return binomPmf(0, Math.max(0, Math.floor(pulls)), p);
}

function rateUpPoolP(pickupCount: number): number {
  return Math.min(TOTAL_3STAR_P, Math.max(0, Math.floor(pickupCount)) * RATEUP_P);
}

// Three mutually-exclusive outcomes for a character banner over `pulls` pulls,
// summing to 1: you land the rate-up Uma, you land only off-banner 3-stars, or
// you whiff every 3-star. Multi-pickup banners combine the per-pickup rate.
export type UmaOutcomeOdds = {
  rateUp: number;
  offBannerOnly: number;
  nothing: number;
};

export function umaOutcomeOdds(pickupCount = 1, pulls: number = SUB_SPARK_PULLS): UmaOutcomeOdds {
  const rateUpP = rateUpPoolP(pickupCount);
  const noRateUp = noneChance(rateUpP, pulls);
  const nothing = noneChance(TOTAL_3STAR_P, pulls);

  return {
    rateUp: 1 - noRateUp,
    offBannerOnly: Math.max(0, noRateUp - nothing),
    nothing
  };
}

export function copiesOdds(input: CopiesOddsInput): CopiesOdds {
  const { startingDupes = 0, mode = 'standard' } = input;
  const p = input.p ?? (mode === 'stepup' ? STEPUP_SLOT_P : RATEUP_P);
  const pulls = normalizeCount(input.pulls);
  const dupes = normalizeCount(startingDupes);
  const guaranteed = mode === 'stepup' ? Math.floor(pulls / 5) + dupes : Math.floor(pulls / PITY_PULLS) + dupes;
  const randomPulls = mode === 'stepup' ? pulls * 10 : pulls;

  const none = tierPmf(0, guaranteed, randomPulls, p);
  const lb0 = tierPmf(1, guaranteed, randomPulls, p);
  const lb1 = tierPmf(2, guaranteed, randomPulls, p);
  const lb2 = tierPmf(3, guaranteed, randomPulls, p);
  const lb3 = tierPmf(4, guaranteed, randomPulls, p);
  const mlbThreshold = MLB_COPIES - 1 - guaranteed;
  const mlb = mlbThreshold < 0 ? 1 : 1 - binomCdf(mlbThreshold, randomPulls, p);

  return { none, lb0, lb1, lb2, lb3, mlb };
}
