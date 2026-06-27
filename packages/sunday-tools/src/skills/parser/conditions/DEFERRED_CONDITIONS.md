# Deferred skill condition tokens

These condition tokens appear in the current skill dataset but are intentionally
**not** implemented yet. Each needs data or an engine model the simulator does
not have today. Implementing them with a wrong stand-in (e.g. using starting
gate as a popularity proxy) produces silently incorrect results, so they are
parked here until the underlying capability exists.

Reference: `simulatability.ts` derives "is this skill simulatable" from
`knownConditionTokens`. A token is supported the moment it has an entry in
`conditions.ts` (and, if opponent/state aware, a dynamic registration under
`full-sim/`). Adding any token below automatically makes its skills simulatable.

## Needs a popularity model (do NOT use `gate`)

`gate` is a runner's starting-gate / post position. It is **not** betting
popularity. Any condition that depends on "the most popular runner" must be
backed by a real popularity/odds ranking, not `gate`.

- **`is_popularity_top_character_activate_advantage_skill`** — true when the
  #1-popularity runner activates an advantage skill. Building blocks exist
  (`Runner.activatedAdvantageEffectTypes` from
  `is_other_character_activate_advantage_skill`), but identifying the
  popularity-1 runner does not.

### Pre-existing code to revisit (same root cause)

These already ship using `gate === 0` as "favorite" and are incorrect by the
same rule. Revisit when a popularity source lands:

- `full-sim/state-conditions.ts` → `running_style_equal_popularity_one`
  (`hasSameStyleAsPopularityOneRunner` matches on `gate === POPULARITY_ONE_GATE`).
- Note: the estimator path has a proper `SkillEvalRunner.popularity` field
  (`parser/definitions.ts`), but the full-sim `Runner` has no equivalent — the
  gap is on the full-sim side.

## Needs a team model

- **`activate_count_all_team`** (e.g. Linkage Hero `1300061`) — counts skills
  activated by the player's **team** during the race.
  - Full sim: requires `Race`/`Runner` to know which runners form a team; no
    team grouping exists today.
  - Single-runner estimator: would have to be a probability.

## Needs per-runner fan data

- **`fan_count`** (e.g. Ashen Trail: Cinderella Gray `120061`) — gates a bonus
  on the runner's fan count (`fan_count>=146738`). Fan numbers are not modeled
  per runner.
  - Option A: no-op (treat as not met).
  - Option B: a per-skill toggle/setting that decides whether the condition
    passes, surfaced in the UI.

## Needs the game's tight-corner threshold/definition

- **`is_tight_track`** (Tight Turns `202241` / `202242` / `202243`) — true on
  racetracks with tight corners.
  - **Not in `master.mdb`**: no column in `race_track` / `race_course_set`, so
    it cannot come from the standard course-data extraction.
  - **Geometry is viable**: `public/data/course_geometry.json` has 1001
    (x,y,z) path samples plus heading quaternions per course. Computing
    heading change (yaw from the rotation quaternion) inside the known corner
    segments (`course_data.json` `corners[]`), with light smoothing, yields
    clean per-course minimum corner radii (~70-140m for current courses).
    The raw whole-path curvature is too noisy; restrict to corner segments.
  - **Still blocked on the cutoff**: the radii do not self-separate into an
    obvious tight/normal cluster, and the game's actual definition is unknown.
    The community reference still lists this token as "probably new, currently
    under investigation" (`src/modules/skills/components/skill-conditions.json`).
    Do not guess a threshold.
  - **When the threshold/definition is known**: implement as a derived field
    like `is_abroad` — compute `minCornerRadius` from geometry and emit
    `isTightTrack` per course, then have the condition read `course.isTightTrack`.
    (Geometry is a separate public asset, not part of the master.mdb
    extraction, so this needs a small dedicated derivation step.)

---

## Implemented for reference

The following previously-missing tokens were added alongside this note and are
now fully supported: `is_activate_any_skill`,
`is_other_character_activate_advantage_skill`, `is_activate_heal_skill`,
`activate_count_later_half`, `phase_laterhalf`,
`phase_first_half_straight_random`, `phase_latter_half_straight_random`,
`up_slope_random_later_half`, `is_used_skill_id_with_detail_one`, `furlong`,
`is_abroad`, `temptation_opponent_count_behind`, `near_infront_count`,
`is_exist_skill_id`.
