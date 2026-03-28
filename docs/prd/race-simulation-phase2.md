# PRD: Race Simulation — Phase 2: Skills, Outfits & Dynamic Conditions

> **Status:** Complete
> **Last updated:** 2026-03-16
> **Depends on:** [Phase 1 (MVP)](race-simulation.md) — Complete

---

## 1. Overview

Phase 2 extends the 9-runner race simulation with user-configurable runners (outfits, skills, stats) and replaces the approximate skill condition system with dynamic conditions that use real runner data. The engine's skill activation system currently uses `noopErlangRandom`, `noopImmediate`, and static `orderRange` values — all designed for vacuum compare's isolated single-runner races. In the full sim, these need to query live race state.

---

## 2. Goals

- Allow users to assign outfits and skills to any of the 9 runners (default runners stay skillless/outfitless)
- Skill conditions that reference other runners use real spatial/order data in `mode === 'normal'`
- Vacuum compare's approximate conditions remain byte-for-byte untouched
- Incremental rollout: conditions without a dynamic implementation fall back to static approximations

---

## 3. Open Questions

- [x] **Runner config UI:** Phase 4 scope. Phase 2 is engine-only — users add outfits/skills through whatever interface exists at the time.
- [x] **Order caching:** Per-tick cache at the Race level. Compute sorted order once per tick, shared across all runners' condition evaluations.
- [x] **Condition priority:** Implement in priority order based on skill frequency / impact.
- [x] **Static counts:** `running_style_count_same` and `same_skill_horse_count` computed once at race setup (they don't change mid-race), not treated as dynamic.
- [x] **Default runner skills/outfits:** Default runners stay skillless/outfitless. Outfits and skills are only added by users manually — no random generation.

---

## 4. Architecture

### 4.1 Runner Configuration

No changes needed. `runRaceSim` already accepts `CreateRunner[]` — the same type used by vacuum compare. Users construct `CreateRunner` objects with outfits and skills the same way they do for compare. `generateMobField()` produces the default skillless field; anything beyond that is a user-configured `CreateRunner`.

### 4.2 Two-Tier Condition System

The core architectural change. Skill conditions are currently evaluated at two stages:

1. **Build-time** (in `buildSkillData` via `ConditionParser`) — determines activation regions (WHERE on the course a skill can trigger)
2. **Runtime** (via `extraCondition` on `PendingSkill`) — dynamic checks at the moment of activation (e.g., `hp_per`, `is_lastspurt`)

For multi-runner conditions, many are currently `noop` at build-time (they pass through all regions) and don't have runtime checks. The fix is to add runtime `extraCondition` functions that query live race state.

**Approach: Dynamic condition registry**

```
dynamicConditions: Map<string, (runner: Runner) => DynamicConditionResult>
```

At skill evaluation time in `buildSkillData`, when a condition key is found in `dynamicConditions`, it returns the full region (noop filtering, same as today's `noopImmediate`/`noopErlangRandom`) but attaches a runtime `extraCondition` that performs the real check.

For conditions NOT in `dynamicConditions`, the existing static behavior is used unchanged.

### 4.3 Condition Inventory (from Phase 1 PRD)

Carried forward from [race-simulation.md](race-simulation.md) Section 8, categorized by implementation approach:

**Category A — Position / order-based (need per-tick order computation):**

- `order`, `order_rate`
- `order_rate_in20_continue`, `order_rate_in40_continue`, `order_rate_in50_continue`, `order_rate_in80_continue`
- `order_rate_out20_continue`, `order_rate_out40_continue`, `order_rate_out50_continue`, `order_rate_out70_continue`
- `change_order_onetime`, `change_order_up_end_after`, `change_order_up_finalcorner_after`, `change_order_up_middle`
- `distance_diff_rate`, `distance_diff_top`, `distance_diff_top_float`
- `is_behind_in`

**Category B — Proximity-based (need spatial queries):**

- `near_count`
- `is_surrounded`
- `bashin_diff_behind`, `bashin_diff_infront`
- `behind_near_lane_time`, `behind_near_lane_time_set1`
- `infront_near_lane_time`
- `visiblehorse`

**Category C — Blocking / overtake (need position + lane + speed):**

- `blocked_front`, `blocked_front_continuetime`
- `blocked_all_continuetime`
- `blocked_side_continuetime`
- `is_overtake`
- `is_move_lane`
- `overtake_target_time`, `overtake_target_no_order_up_time`

**Category D — Other-runner state (need to read other runners' states):**

- `is_temptation` (rushed state)
- `temptation_count`, `temptation_count_behind`, `temptation_count_infront`
- `running_style_temptation_count_nige`, `_senko`, `_sashi`, `_oikomi`
- `running_style_count_same`, `running_style_count_same_rate`
- `running_style_equal_popularity_one`
- `same_skill_horse_count`
- `compete_fight_count`

**Category E — Likely permanent static (no meaningful dynamic implementation):**

- `lane_type`
- `popularity`
- `is_exist_chara_id`, `remain_distance_viewer_id`

---

## 5. Per-Tick Order Cache

A new field on `Race`, computed once at the start of each tick in `Race.onUpdate()` before the runner loop:

```typescript
// On Race class
public runnerOrder!: Map<number, number>;  // runnerId → 1-indexed position (1 = first place)
```

Computed by sorting `race.runners` by `position` descending and assigning ranks. This replaces the per-runner sorting that `proximityDueling()` already does (can be refactored to read from this cache) and is shared by all order-based dynamic conditions.

For `mode === 'compare'`, this map is empty or not computed (short-circuit in `onUpdate`).

---

## 6. Static Counts at Race Setup

Computed once in `Race.prepareRace()` (which already iterates runners for `strategyCounts` and `runnersPerStrategy`):

- **`running_style_count_same`**: Already available via `strategyCounts.get(runner.strategy)`
- **`running_style_count_same_rate`**: `strategyCounts.get(runner.strategy) / runners.size`
- **`same_skill_horse_count`**: Already available via `commonSkills` map (counts per skill ID across runners)

These don't change mid-race, so they can be read directly from existing `Race` fields at build-time in `buildSkillData` for `mode === 'normal'` — no dynamic condition needed.

---

## 7. Implementation Order

```
Step 1: Per-tick order cache on Race
Step 2: Static counts wired into buildSkillData for mode === 'normal'
Step 3: Dynamic condition registry architecture (two-tier lookup)
Step 4: Category A — Order-based conditions (highest impact, most common)
         order, order_rate, order_rate_inXX_continue, order_rate_outXX_continue,
         distance_diff_top, distance_diff_rate, is_behind_in,
         change_order_onetime, change_order_up_*
Step 5: Category B — Proximity-based conditions
         near_count, is_surrounded,
         bashin_diff_behind, bashin_diff_infront,
         behind_near_lane_time, behind_near_lane_time_set1,
         infront_near_lane_time, visiblehorse
Step 6: Category C — Blocking / overtake conditions
         blocked_front, blocked_front_continuetime,
         blocked_all_continuetime, blocked_side_continuetime,
         is_overtake, is_move_lane,
         overtake_target_time, overtake_target_no_order_up_time
Step 7: Category D — Other-runner state conditions
         is_temptation, temptation_count, temptation_count_behind/infront,
         running_style_temptation_count_*,
         running_style_equal_popularity_one, compete_fight_count
```

**Priority rationale:**
- **Steps 1-3** are infrastructure — needed before any conditions work. Runner configuration is already handled by the existing `CreateRunner` type (no work needed).
- **Step 4 (order-based)** is highest impact: `order_rate` and `order_rate_inXX_continue` are used by the majority of gold and unique skills. These are the conditions where the vacuum approximation is furthest from reality.
- **Step 5 (proximity)** is next: `near_count` and `is_surrounded` are common triggers, and the spatial query pattern already exists from Phase 1's lane movement and dueling.
- **Step 6 (blocking)** is medium: complements the direct spatial queries already in `applyLaneMovement()` from Phase 1, now extended to skill conditions.
- **Step 7 (other-runner state)** is lowest: temptation/rushed counts are niche and affect fewer skills.
- **Category E** stays permanently static — no implementation needed.

---

## 8. What Is NOT Changing

- Vacuum compare (`mode === 'compare'`) — all static approximations untouched
- The `ConditionParser` and `buildSkillData` pipeline structure
- Existing skill activation mechanics (wit checks, region sampling, duration scaling)
- Phase 1 engine changes (position keeping, real dueling, spatial lane movement)

---

## 9. Future Context

This PRD feeds into:

- **Phase 3:** Data collection + worker + snapshotting
- **Phase 4:** UI — runner configuration panel, visualization
- **Phase 5:** Statistical analysis (win rates, position distributions)
