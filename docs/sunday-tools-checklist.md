# Sunday-Tools Remaining Work Checklist

Living checklist for completing `sunday-tools` migration and parity work.

## P0 - correctness and parity

- [ ] Implement `Race.collectStats()` in `src/lib/sunday-tools/common/race.ts`
- [ ] Fix single-runner behavior when `positionKeepMode` is `Approximate` (statistical pacer behavior, no "second runner" assumptions)
- [ ] Add/finish missing parser pieces (`ConditionMatcher` methods currently throwing `Not implemented`)
- [ ] Close parser/operator correctness gaps marked as `FIXME` in:
  - `src/lib/sunday-tools/skills/parser/conditions/conditions.ts`
  - `src/lib/sunday-tools/skills/parser/conditions/operators.ts`
- [ ] Resolve known skill trigger bug noted in `src/lib/sunday-tools/runner/runner.utils.ts` (NY Ace double-trigger case)
- [ ] Add support for multi-trigger/cooldown behavior in `ActivationSamplePolicy` where currently TODO

## P0 - instrumentation and observability

- [ ] Add explicit Sunday-engine hooks for:
  - skill activation
  - effect start
  - effect expiration
- [ ] Add canonical per-run trace snapshot API (positions, hp, lanes, effects), replacing ad-hoc reconstruction in feature modules
- [ ] Ensure trace payloads are stable for worker/store/chart consumers

## P1 - migration completion (app side)

- [ ] Migrate `src/modules/skill-planner/simulator.ts` off old solver stack
- [ ] Replace remaining old engine imports under `src/modules/simulation/*` and `src/modules/racetrack/*` with `sunday-tools` definitions
- [ ] Migrate remaining worker-facing type imports currently anchored in old simulation lib paths
- [ ] Consolidate race condition mapping (`groundCondition` vs `ground`, `time` vs `timeOfDay`) in one shared adapter
- [ ] Consolidate runner stat mapping (`wisdom` -> `wit`) in one shared adapter

## P1 - API ergonomics

- [ ] Remove requirement for manual `race.onInitialize()` by making initialization constructor-safe (or provide a factory)
- [ ] Introduce a small builder/factory wrapper for repetitive compare setup (course/params/settings/dueling rates)
- [ ] Add forced skill position support equivalent to old `addSkillAtPosition` behavior

## P1 - testing

- [ ] Add seeded parity tests comparing old/new outputs for core scenarios
- [ ] Add regression tests for position-keep states across all strategies
- [ ] Add regression tests for rushed/downhill/spot-struggle/dueling transitions
- [ ] Add worker integration tests for stage-merge behavior (`5 -> 20 -> 50 -> 200` sample pipeline)

## P2 - performance and cleanup

- [ ] Profile compare loops and identify high-allocation hot paths
- [ ] Add benchmark script for Sunday compare throughput across sample counts
- [ ] Remove dead/legacy engine code paths once all consumers are migrated
- [ ] Update docs and README references to reflect Sunday-tools as default engine

## Done recently (for context)

- [x] Migrated `src/modules/simulation/simulators/skill-compare.ts` to `sunday-tools`
- [x] Updated comparison flow to preserve existing response shape for workers/stores
- [x] Replaced old solver imports in skill-compare with Sunday engine imports
