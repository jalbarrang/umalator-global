export const RATEUP_P = 0.0075;
const STEPUP_SLOT_P = 0.003;
export const PITY_PULLS = 200;
const MLB_COPIES = 5;

export type CopiesOdds = {
  none: number;
  lb0: number;
  lb1: number;
  lb2: number;
  lb3: number;
  mlb: number;
};

type CopiesOddsMode = 'standard' | 'stepup';

export type CopiesOddsInput = {
  pulls: number;
  p?: number;
  startingDupes?: number;
  mode?: CopiesOddsMode;
};

const LOG_SQRT_TWO_PI = 0.9189385332046727;
const LANCZOS_G = 7;
const LANCZOS_COEFFICIENTS = [
  0.9999999999998099, 676.5203681218851, -1259.1392167224028, 771.3234287776531, -176.6150291621406,
  12.507343278686905, -0.13857109526572012, 0.000009984369578019572, 0.00000015056327351493116
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

  return (
    logGamma(n + 1) -
    logGamma(k + 1) -
    logGamma(n - k + 1) +
    k * Math.log(p) +
    (n - k) * Math.log1p(-p)
  );
}

function binomDist(k: number, n: number, p: number, cumulative: boolean): number {
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

function binomCdf(k: number, n: number, p: number): number {
  return binomDist(k, n, p, true);
}

function tierPmf(totalCopies: number, guaranteed: number, pulls: number, p: number) {
  return binomPmf(totalCopies - guaranteed, pulls, p);
}

// Confirmed by the live gacha_odds endpoint: total 3-star rate on a character
// banner is 3%, each rate-up (pickup) Uma is 0.75%, and the remainder is split
// across the off-banner 3-star pool. The same flat 0.75% holds per rate-up SSR
// support card and does NOT divide on multi-pickup banners (verified against the
// 2-SSR Maruzensky/Nakayama and 4th Anniv 2-SSR banners), so per-target copy
// odds are correct as-is; multi-pickup banners only need a labeling caveat that
// the spark guarantees a single copy of a single card.
const TOTAL_3STAR_P = 0.03;
// "Less than 200 pulls" excludes the guaranteed spark at pull 200.
const SUB_SPARK_PULLS = PITY_PULLS - 1;

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

export type TargetGoalsInput = {
  pulls: number;
  // Desired total copies per targeted card (1..MLB_COPIES). Cards with goal 0
  // are ignored. Each rate-up shares the same per-pull rate `p`.
  goals: number[];
  p?: number;
  mode?: CopiesOddsMode;
};

// Probability of meeting every per-card copy goal at once. Random copies for
// each card are independent Binomial(pulls, p) (the combined rate-up rate stays
// below ~6%, so multinomial correlation is negligible). Pity sparks are
// guaranteed exchanges allocated optimally to cover shortfalls, so success is
// exactly: total shortfall = Σ max(0, goal_i - randomCopies_i) ≤ sparks. We build
// each card's shortfall distribution and convolve them, then sum P(total ≤ sparks).
export function targetGoalsOdds(input: TargetGoalsInput): number {
  const mode = input.mode ?? 'standard';
  const p = input.p ?? (mode === 'stepup' ? STEPUP_SLOT_P : RATEUP_P);
  const pulls = normalizeCount(input.pulls);
  const goals = input.goals
    .map((goal) => Math.min(MLB_COPIES, normalizeCount(goal)))
    .filter((goal) => goal >= 1);
  if (goals.length === 0) return 1;

  const sparkAt = mode === 'stepup' ? 5 : PITY_PULLS;
  const randomPulls = mode === 'stepup' ? pulls * 10 : pulls;
  const sparks = Math.floor(pulls / sparkAt);

  // dist[s] = probability that the running total shortfall equals s.
  let dist = [1];
  for (const goal of goals) {
    const shortfall: number[] = Array.from({ length: goal + 1 }, () => 0);
    // shortfall 0 means the card already has >= goal random copies.
    shortfall[0] = 1 - binomCdf(goal - 1, randomPulls, p);
    for (let missing = 1; missing <= goal; missing += 1) {
      shortfall[missing] = binomPmf(goal - missing, randomPulls, p);
    }

    const next: number[] = Array.from({ length: dist.length + goal }, () => 0);
    for (let a = 0; a < dist.length; a += 1) {
      for (let missing = 0; missing <= goal; missing += 1) {
        next[a + missing] += dist[a] * shortfall[missing];
      }
    }
    dist = next;
  }

  let total = 0;
  for (let s = 0; s <= Math.min(sparks, dist.length - 1); s += 1) {
    total += dist[s];
  }
  return Math.min(1, Math.max(0, total));
}

export function copiesOdds(input: CopiesOddsInput): CopiesOdds {
  const { startingDupes = 0, mode = 'standard' } = input;
  const p = input.p ?? (mode === 'stepup' ? STEPUP_SLOT_P : RATEUP_P);
  const pulls = normalizeCount(input.pulls);
  const dupes = normalizeCount(startingDupes);
  const guaranteed =
    mode === 'stepup' ? Math.floor(pulls / 5) + dupes : Math.floor(pulls / PITY_PULLS) + dupes;
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
