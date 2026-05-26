# Skill Planner Encoding

## Overview

This document describes the binary encoding format used for importing and exporting Skill Planner sessions. It allows external tools to produce a compact, copy-pasteable code that hydrates the full planner state — runner, obtained skills, candidate shop skills with hint levels, budget, and modifiers — in one step.

The encoding uses the same `BitVector` + URL-safe Base64 pipeline as the Single Uma Export format ([external spec](https://github.com/cBachoo/uma-rosterview/blob/master/ENCODING_SINGLE.md), local implementation in `../../runners/share/encoding.ts`) but carries a different payload under its own version namespace.

## What's Included

- **Runner identity**: Character card ID
- **Base statistics**: Speed, Stamina, Power, Guts, Wisdom
- **Aptitudes**: All 10 individual aptitude values (distance × 4, ground × 2, running style × 4)
- **Strategy**: Running strategy (Front Runner / Pace Chaser / Late Surger / End Closer / Runaway)
- **Mood**: Runner mood modifier
- **Obtained skills**: Skills the runner has already learned (IDs only)
- **Candidate skills**: Shop skills being considered, each with a hint level
- **Budget**: Available skill points
- **Fast Learner flag**: Whether the runner has the Fast Learner discount

## What's NOT Included

The following are excluded to keep the encoding focused on planner input:

- Race settings (course, weather, season, ground condition) — these are track-specific and configured in the planner UI
- Optimization results, seed, or progress state
- Talent level, rarity, factors, parents (use the Roster Encoding ([external spec](https://github.com/cBachoo/uma-rosterview/blob/master/ENCODING.md), local implementation in `../../runners/share/roster-encoding.ts`) for full veteran data)
- Rank score, creation date (not relevant to planning)

---

## Encoding Specification — Version 1

### Notation

- **Lengths in bits** are fixed values determined by the maximum possible values
- **Values are unsigned integers** unless otherwise specified
- **Base64** uses URL-safe alphabet: `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`

### Binary Format

#### 1. Header (8 bits)

| Field   | Length (bits) | Type    | Range      |
| ------- | ------------- | ------- | ---------- |
| version | 8             | `uint8` | `[0, 255]` |

The version field identifies the encoding format. Current version is **1**.

#### 2. Runner Data

##### 2.1 Basic Information (20 bits)

| Field    | Length (bits) | Type     | Range          |
| -------- | ------------- | -------- | -------------- |
| card\_id | 20            | `uint32` | `[0, 1048575]` |

The `card_id` identifies the character card (e.g., `100601` for Special Week). This maps to `outfitId` in the runner state.

##### 2.2 Statistics (55 bits total)

| Field   | Length (bits) | Type     | Range       |
| ------- | ------------- | -------- | ----------- |
| speed   | 11            | `uint16` | `[0, 2047]` |
| stamina | 11            | `uint16` | `[0, 2047]` |
| power   | 11            | `uint16` | `[0, 2047]` |
| guts    | 11            | `uint16` | `[0, 2047]` |
| wiz     | 11            | `uint16` | `[0, 2047]` |

All statistics are 11 bits each, supporting values from 0 to 2047. Values are clamped to this range during encoding. Field order matches the Single Uma Export format.

##### 2.3 Aptitudes (40 bits total)

| Field                          | Length (bits) | Type    | Range    |
| ------------------------------ | ------------- | ------- | -------- |
| proper\_distance\_short        | 4             | `uint8` | `[0, 9]` |
| proper\_distance\_mile         | 4             | `uint8` | `[0, 9]` |
| proper\_distance\_middle       | 4             | `uint8` | `[0, 9]` |
| proper\_distance\_long         | 4             | `uint8` | `[0, 9]` |
| proper\_ground\_turf           | 4             | `uint8` | `[0, 9]` |
| proper\_ground\_dirt           | 4             | `uint8` | `[0, 9]` |
| proper\_running\_style\_nige   | 4             | `uint8` | `[0, 9]` |
| proper\_running\_style\_senko  | 4             | `uint8` | `[0, 9]` |
| proper\_running\_style\_sashi  | 4             | `uint8` | `[0, 9]` |
| proper\_running\_style\_oikomi | 4             | `uint8` | `[0, 9]` |

Aptitude values use the same numeric encoding as the Single Uma Export format.

**Aptitude Grades:**

| Value | Grade |
| ----- | ----- |
| 1     | G     |
| 2     | F     |
| 3     | E     |
| 4     | D     |
| 5     | C     |
| 6     | B     |
| 7     | A     |
| 8     | S     |

> **Note for encoders:** When only aggregate aptitudes are available (one value per distance/surface/strategy), write the same value for all sub-fields in the group. For example, if `distance_aptitude = A (7)`, write `7` for all four distance fields.

##### 2.4 Strategy (3 bits)

| Field    | Length (bits) | Type    | Range    |
| -------- | ------------- | ------- | -------- |
| strategy | 3             | `uint8` | `[1, 5]` |

| Value | Strategy     |
| ----- | ------------ |
| 1     | Front Runner |
| 2     | Pace Chaser  |
| 3     | Late Surger  |
| 4     | End Closer   |
| 5     | Runaway      |

Values 0 and 6-7 are reserved for future use. Decoders should treat unknown values as Front Runner (1).

##### 2.5 Mood (3 bits)

| Field | Length (bits) | Type    | Range    |
| ----- | ------------- | ------- | -------- |
| mood  | 3             | `uint8` | `[0, 4]` |

Mood is stored as an offset from the internal value: `encoded = mood + 2`, where mood ranges from -2 (Awful) to +2 (Great).

| Encoded | Internal | Name   |
| ------- | -------- | ------ |
| 0       | -2       | Awful  |
| 1       | -1       | Bad    |
| 2       | 0        | Normal |
| 3       | +1       | Good   |
| 4       | +2       | Great  |

Values 5-7 are reserved for future use. Decoders should treat unknown values as Great (4).

#### 3. Planner Metadata (17 bits)

| Field         | Length (bits) | Type     | Range        |
| ------------- | ------------- | -------- | ------------ |
| budget        | 16            | `uint16` | `[0, 65535]` |
| fast\_learner | 1             | `uint1`  | `{0, 1}`     |

- `budget`: Available skill points. 16 bits supports up to 65,535 SP (more than sufficient; typical budgets are 500–3,000).
- `fast_learner`: `1` if the runner has the Fast Learner skill, `0` otherwise.

#### 4. Obtained Skills (variable length)

| Field            | Length (bits) | Type     | Range          |
| ---------------- | ------------- | -------- | -------------- |
| obtained\_count  | 6             | `uint8`  | `[0, 63]`     |

For each obtained skill:

| Field     | Length (bits) | Type     | Range          |
| --------- | ------------- | -------- | -------------- |
| skill\_id | 20            | `uint32` | `[0, 1048575]` |

Obtained skills are skills the runner has already learned. They are excluded from budget calculations and used as the baseline for optimization.

#### 5. Candidate Skills (variable length)

| Field             | Length (bits) | Type    | Range      |
| ----------------- | ------------- | ------- | ---------- |
| candidate\_count  | 7             | `uint8` | `[0, 127]` |

For each candidate skill:

| Field       | Length (bits) | Type     | Range          |
| ----------- | ------------- | -------- | -------------- |
| skill\_id   | 20            | `uint32` | `[0, 1048575]` |
| hint\_level | 3             | `uint8`  | `[0, 5]`       |

- `skill_id`: The GameTora skill ID.
- `hint_level`: Hint level for cost discount calculation (0 = no hint, 5 = maximum hint).

Values 6-7 for `hint_level` are reserved. Decoders should clamp to 5.

The candidate count field is 7 bits (max 127) since the shop can contain more skills than a runner's learned set.

---

## Size Analysis

### Bit Breakdown

**Fixed fields (always present):**

```
Version:            8 bits
card_id:           20 bits
Stats:             55 bits  (11 × 5)
Aptitudes:         40 bits  (4 × 10)
Strategy:           3 bits
Mood:               3 bits
Budget:            16 bits
Fast Learner:       1 bits
obtained_count:     6 bits
candidate_count:    7 bits
────────────────────────────
Total fixed:      159 bits
```

**Variable fields:**

```
Per obtained skill:   20 bits
Per candidate skill:  23 bits  (20 + 3)
```

### Examples

**Minimal (no skills):**

```
159 bits = 27 Base64 characters
```

**Typical session (10 obtained, 15 candidates):**

```
159 + (10 × 20) + (15 × 23) = 159 + 200 + 345 = 704 bits
                              = 118 Base64 characters
```

**Large session (20 obtained, 40 candidates):**

```
159 + (20 × 20) + (40 × 23) = 159 + 400 + 920 = 1479 bits
                              = 247 Base64 characters
```

**Maximum (63 obtained, 127 candidates):**

```
159 + (63 × 20) + (127 × 23) = 159 + 1260 + 2921 = 4340 bits
                               = 724 Base64 characters
```

### Typical Size Range

| Obtained | Candidates | Approximate Length |
| -------- | ---------- | ------------------ |
| 0        | 0          | ~27 chars          |
| 5–10     | 10–15      | 80–120 chars       |
| 10–15    | 15–25      | 120–170 chars      |
| 15–20    | 25–40      | 170–250 chars      |
| 20+      | 40+        | 250+ chars         |

Most practical imports will be **80–200 characters** — compact enough for chat messages and URLs.

---

## Encoding Process

1. Create a `BitVector` instance
2. Write version header (8 bits, value = `1`)
3. Write `card_id` (20 bits)
4. Write stats in order: speed, stamina, power, guts, wiz (11 bits each, clamped to 2047)
5. Write aptitudes in order: distances (short, mile, middle, long), grounds (turf, dirt), styles (nige, senko, sashi, oikomi) — 4 bits each, clamped to 9
6. Write `strategy` (3 bits)
7. Write `mood` as `mood_value + 2` (3 bits)
8. Write `budget` (16 bits, clamped to 65535)
9. Write `fast_learner` flag (1 bit)
10. Write `obtained_count` (6 bits, max 63)
11. For each obtained skill: write `skill_id` (20 bits)
12. Write `candidate_count` (7 bits, max 127)
13. For each candidate skill:
    - Write `skill_id` (20 bits)
    - Write `hint_level` (3 bits, clamped to 5)
14. Pad bit vector to multiple of 6
15. Convert to URL-safe Base64

## Decoding Process

1. Convert Base64 string to `BitVector`
2. Check minimum bits (159)
3. Read version (8 bits), verify it is `1`
4. Read `card_id` (20 bits)
5. Read stats (5 × 11 bits)
6. Read aptitudes (10 × 4 bits)
7. Read `strategy` (3 bits)
8. Read `mood` (3 bits), subtract 2 for internal value
9. Read `budget` (16 bits)
10. Read `fast_learner` (1 bit)
11. Read `obtained_count` (6 bits)
12. For each obtained skill: read `skill_id` (20 bits)
13. Read `candidate_count` (7 bits)
14. For each candidate skill:
    - Read `skill_id` (20 bits)
    - Read `hint_level` (3 bits), clamp to 5
15. Return `SkillPlannerExportData` object

## Error Handling

### Encoding

- Stats are clamped to 0–2047
- Aptitudes are clamped to 0–9
- Budget is clamped to 0–65535
- Hint levels are clamped to 0–5
- Only the first 63 obtained skills are encoded
- Only the first 127 candidate skills are encoded

### Decoding

- Returns `null` if fewer than 159 bits remain (minimum payload)
- Returns `null` if version ≠ 1
- Clamps `hint_level` values > 5 to 5
- Treats unknown strategy values as Front Runner (1)
- Treats unknown mood values as Great (4)
- Stops reading skills early if insufficient bits remain

---

## Comparison with Single Uma Export

| Feature              | Skill Planner Export | Single Uma Export |
| -------------------- | -------------------- | ----------------- |
| Version              | 1                    | 2                 |
| Purpose              | Planner sessions     | Veteran sharing   |
| Runner stats         | ✅                   | ✅                |
| Aptitudes            | ✅ (10 fields)       | ✅ (10 fields)    |
| Strategy             | ✅                   | ❌                |
| Mood                 | ✅                   | ❌                |
| Create time          | ❌                   | ✅                |
| Rank score           | ❌                   | ✅                |
| Obtained skills      | ✅ (IDs only)        | ✅ (IDs + levels) |
| Candidate skills     | ✅ (IDs + hints)     | ❌                |
| Budget               | ✅                   | ❌                |
| Fast Learner         | ✅                   | ❌                |
| Typical size         | 80–200 chars         | 67–140 chars      |

**Use Skill Planner Export when:**

- Importing a full planner session from an external career tracker
- Sharing skill shop configurations between tools
- Deep-linking to a pre-configured planner state

**Use Single Uma Export when:**

- Sharing individual trained uma data
- Importing veterans into the roster or race simulator

---

## Data Types

```typescript
type HintLevel = 0 | 1 | 2 | 3 | 4 | 5;

type SkillPlannerExportSkill = {
  skill_id: number;
  hint_level: HintLevel;
};

type SkillPlannerExportData = {
  card_id: number;
  speed: number;
  stamina: number;
  power: number;
  guts: number;
  wiz: number;
  proper_distance_short: number;
  proper_distance_mile: number;
  proper_distance_middle: number;
  proper_distance_long: number;
  proper_ground_turf: number;
  proper_ground_dirt: number;
  proper_running_style_nige: number;
  proper_running_style_senko: number;
  proper_running_style_sashi: number;
  proper_running_style_oikomi: number;
  strategy: number;
  mood: number;
  budget: number;
  fast_learner: boolean;
  obtained_skills: Array<{ skill_id: number }>;
  candidate_skills: Array<SkillPlannerExportSkill>;
};
```

---

## Implementation Reference

### Encoding (pseudocode)

```javascript
function encodeSkillPlanner(data) {
  const bv = new BitVector();

  // Header
  bv.write(1, 8);                          // version

  // Runner
  bv.write(data.card_id, 20);
  bv.write(clamp(data.speed, 0, 2047), 11);
  bv.write(clamp(data.stamina, 0, 2047), 11);
  bv.write(clamp(data.power, 0, 2047), 11);
  bv.write(clamp(data.guts, 0, 2047), 11);
  bv.write(clamp(data.wiz, 0, 2047), 11);

  // Aptitudes (10 × 4 bits)
  for (const apt of aptitudeFields) {
    bv.write(clamp(data[apt], 0, 9), 4);
  }

  // Strategy & mood (clamped to valid ranges)
  bv.write(clamp(data.strategy, 1, 5), 3);  // unknown → 1 (Front Runner)
  bv.write(clamp(data.mood + 2, 0, 4), 3);  // unknown → 4 (Great)

  // Planner metadata
  bv.write(clamp(data.budget, 0, 65535), 16);
  bv.write(data.fast_learner ? 1 : 0, 1);

  // Obtained skills
  const obtained = data.obtained_skills.slice(0, 63);
  bv.write(obtained.length, 6);
  for (const s of obtained) {
    bv.write(s.skill_id, 20);
  }

  // Candidate skills
  const candidates = data.candidate_skills.slice(0, 127);
  bv.write(candidates.length, 7);
  for (const s of candidates) {
    bv.write(s.skill_id, 20);
    bv.write(clamp(s.hint_level, 0, 5), 3);
  }

  return bv.toBase64();
}
```

### Decoding (pseudocode)

```javascript
function decodeSkillPlanner(encoded) {
  const bv = BitVector.fromBase64(encoded);
  if (bv.bitsRemaining() < 159) return null;

  const version = bv.read(8);
  if (version !== 1) return null;

  const card_id = bv.read(20);
  const speed = bv.read(11);
  const stamina = bv.read(11);
  const power = bv.read(11);
  const guts = bv.read(11);
  const wiz = bv.read(11);

  // Read 10 aptitude fields (4 bits each)
  const aptitudes = {};
  for (const field of aptitudeFields) {
    aptitudes[field] = bv.read(4);
  }

  // Clamp strategy/mood to valid ranges on decode
  const rawStrategy = bv.read(3);
  const strategy = (rawStrategy >= 1 && rawStrategy <= 5) ? rawStrategy : 1;
  const rawMood = bv.read(3);
  const mood = (rawMood >= 0 && rawMood <= 4 ? rawMood : 4) - 2;

  const budget = bv.read(16);
  const fast_learner = bv.read(1) === 1;

  const obtained_count = bv.read(6);
  const obtained_skills = [];
  for (let i = 0; i < obtained_count; i++) {
    if (bv.bitsRemaining() < 20) break;  // guard against truncated data
    obtained_skills.push({ skill_id: bv.read(20) });
  }

  if (bv.bitsRemaining() < 7) {
    return { ...result, candidate_skills: [] };  // truncated before candidates
  }

  const candidate_count = bv.read(7);
  const candidate_skills = [];
  for (let i = 0; i < candidate_count; i++) {
    if (bv.bitsRemaining() < 23) break;  // guard against truncated data
    const skill_id = bv.read(20);
    const hint_level = Math.min(bv.read(3), 5);
    candidate_skills.push({ skill_id, hint_level });
  }

  return { card_id, speed, stamina, power, guts, wiz, ...aptitudes,
           strategy, mood, budget, fast_learner,
           obtained_skills, candidate_skills };
}
```

---

## Future Extensibility

To support new encoding versions:

1. Increment version number in header
2. Add new encode/decode functions for the new format
3. Update version check in decoder to handle multiple versions
4. Maintain backward compatibility for older versions

Potential future additions:

- V2: Race settings (course ID, weather, season, ground condition)
- V2: Compression for large candidate lists
- V2: Ignore stamina consumption flag

---

## Version History

### Version 1 (Current)

- Initial release
- Supports full runner data (stats, aptitudes, strategy, mood)
- Obtained skills (IDs only)
- Candidate skills with hint levels (0–5)
- Budget and Fast Learner modifier
- Maximum 63 obtained skills, 127 candidate skills
