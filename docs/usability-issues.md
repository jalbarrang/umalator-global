# Usability Issues Tracker

This document catalogs UI/UX improvements needed to make the Umalator simulator more accessible to users who are familiar with Uma Musume: Pretty Derby but are new to this tool.

## Priority Legend

| Tag    | Meaning                                                                   |
| ------ | ------------------------------------------------------------------------- |
| **P1** | Blocks basic usage — users cannot complete core tasks                     |
| **P2** | Causes confusion but workaroundable — users can figure it out with effort |
| **P3** | Nice-to-have polish — improves experience but not critical                |

---

## 1. Simulator-Specific Terminology

Issues where the tool uses internal/simulator-specific concepts that differ from in-game terminology or lack explanation.

### 1.1 "Run all samples" / "Run one sample" buttons [P1]

**Problem:** The main action buttons don't explain what they do.

- "Run all samples" performs 1000 simulations — this is not indicated anywhere
- "Run one sample" runs a single simulation — users may not understand the difference
- No indication of why you'd choose one over the other

**Suggested fix:** Add subtitle text or tooltips:

- "Run all samples" → "Run all samples (1000 simulations)"
- "Run one sample" → "Run one sample (single simulation)"

**File:** Button implementation likely in [`src/components/run-pane.tsx`](../src/components/run-pane.tsx)

---

### 1.2 Section numbers (1-24) on track visualization [P2]

**Problem:** The track chart displays section numbers 1-24, but these are internal simulation segments not used in the game.

- Game players think in terms of phases (Opening, Middle, Final, Last Spurt)
- The 24 sections are a simulation implementation detail
- No explanation that sections map to specific distances

**Suggested fix:**

- Add a toggle to hide section numbers for casual users
- Or add a tooltip/legend explaining: "Sections 1-24 are simulation segments. Sections 1-4 = Opening, 5-16 = Middle, 17-20 = Final, 21-24 = Last Spurt"

**File:** Track visualization in [`src/modules/racetrack/`](../src/modules/racetrack/)

---

### 1.3 Stat input range not indicated [P3]

**Problem:** Users don't know the valid stat range (1-2000) or that values above 1200 have special behavior (halving before base stat conversion).

- No visual feedback when entering values
- No indication of what constitutes a "high" or "low" value for simulation purposes
- The "SS" grade badge appears but the grade thresholds aren't explained

**Suggested fix:**

- Add placeholder text showing range (e.g., "1-2000")
- Consider adding a visual indicator (progress bar or color) showing where the value falls
- Tooltip explaining the 1200+ halving mechanic for advanced users

**File:** [`src/modules/runners/components/StatInput.tsx`](../src/modules/runners/components/StatInput.tsx)

---

## 2. Track Visualization Clarity

Issues with the race track chart readability and information density.

### 2.1 Missing phase color legend [P2]

**Problem:** The track visualization uses distinct colors for race phases (yellow for Opening, green for Middle, pink for Final, etc.) but there's no legend.

- Users must guess what the colors mean
- Color-only differentiation may be problematic for colorblind users

**Suggested fix:** Add a small legend below the track showing:

- Yellow = Opening leg (Sections 1-4)
- Green = Middle leg (Sections 5-16)
- Pink = Final leg (Sections 17-20)
- Red/Magenta = Last Spurt (Sections 21-24)

**File:** [`src/modules/racetrack/`](../src/modules/racetrack/)

---

### 2.2 Corner labels could be clearer [P3]

**Problem:** Corners are labeled "C1", "C2", "C3", "C4" which is compact but not immediately obvious.

- First-time users may not recognize "C" means "Corner"
- Could spell out "Corner 1" at least once, then abbreviate

**Suggested fix:** Either:

- Add "Corners: C1-C4" to the legend
- Or use "Corner 1" for the first occurrence

**File:** [`src/modules/racetrack/`](../src/modules/racetrack/)

---

### 2.3 Elevation markers overlap with labels [P3]

**Problem:** On some courses, the elevation profile numbers (e.g., "111m", "336m", "1950m") overlap with corner/straight labels, making both harder to read.

**Suggested fix:**

- Adjust label positioning to avoid overlap
- Consider showing elevation on hover only
- Or use a separate elevation row

**File:** [`src/modules/racetrack/`](../src/modules/racetrack/)

---

## 3. Missing Interactive Help

Areas where tooltips or contextual help would significantly improve understanding.

### 3.1 No tooltips on aptitude effects [P2]

**Problem:** Aptitude grades (S, A, B, C, D, E, F, G) are shown with icons but users can't see the numerical impact.

- Game shows letters but doesn't expose the actual multipliers
- Simulator users would benefit from knowing: S=1.05x, A=1.0x, B=0.9x, etc.
- Different aptitudes affect different mechanics (speed vs acceleration)

**Suggested fix:** Add tooltips to aptitude dropdowns showing:

- "S: 1.05x modifier"
- "A: 1.0x modifier (baseline)"
- "B: 0.9x modifier"
- etc.

**File:** [`src/modules/runners/components/AptitudeSelect.tsx`](../src/modules/runners/components/AptitudeSelect.tsx)

---

### 3.2 Simulation settings lack explanations [P2]

**Problem:** The settings panel (gear icon) contains options like "Position Keep" modes and "Wit Variance" without explaining what they do.

- "Position Keep: Approximate / Exact / Off" — what's the difference?
- "Wit Variance: On / Off" — what does this simulate?
- "Virtual Pacemaker" — what is this for?

**Suggested fix:** Add info icons (ℹ️) next to each setting that show tooltips:

- Position Keep: "Controls how the simulator handles uma position adjustments during the race"
- Wit Variance: "Adds randomness based on wisdom stat per section (more realistic but less deterministic)"
- Virtual Pacemaker: "Simulates the presence of other umas for position-keeping calculations"

**File:** Settings panel implementation (needs to be located)

---

### 3.3 Skill conditions not in plain language [P3]

**Problem:** Skills show their activation conditions using internal identifiers (e.g., `phase==2`, `corner_random`) rather than human-readable text.

- Players know skill effects from the game but not the technical condition syntax
- The `_random` suffix in conditions like `corner_random` isn't explained

**Suggested fix:**

- Translate conditions to plain language: `phase==2` → "Activates in Final leg"
- Add glossary for condition types somewhere accessible

**File:** [`src/modules/skills/components/formatters.tsx`](../src/modules/skills/components/formatters.tsx)

---

## 4. Results Interpretation

Issues with understanding simulation output.

### 4.1 ~~No guide for reading results~~ [P2] ⚡ PARTIALLY RESOLVED

**Problem:** After running simulations, users see statistics (mean, median, percentiles) but may not understand:

- What the numbers represent (time? distance? skill coverage?)
- How to compare different skill setups
- What constitutes a "good" result

**Suggested fix:**

- Add a brief "How to read results" section or tooltip
- Label statistics more clearly (e.g., "Avg. Race Time" instead of just numbers)
- Consider adding comparison guidance

**What's been done:**

- ✅ Compare mode now shows explanatory text: "Negative numbers mean Umamusume 1 is faster, positive numbers mean Umamusume 2 is faster"
- ✅ Statistics are clearly labeled (Minimum, Maximum, Mean, Median) with "lengths" unit
- ✅ Win Distribution shows clear percentages

**Remaining:**

- Skill Chart mode still lacks unit explanation ("L" for lengths)
- No tooltips on column headers in skill efficacy table

**File:** Results display components in [`src/modules/simulation/`](../src/modules/simulation/)

---

### 4.2 Skill efficacy table interpretation [P3]

**Problem:** The skill efficacy table shows various statistics but column meanings aren't immediately clear.

- What does "effective length" mean in practical terms?
- How do min/max/mean help in skill selection?

**Suggested fix:** Add column header tooltips explaining each statistic.

**File:** [`src/modules/simulation/`](../src/modules/simulation/)

---

## 5. Settings Panel Discoverability

Issues with finding and understanding configuration options.

### 5.1 ~~Race Settings not easily discoverable~~ [P3] ✅ DONE

**Problem:** The gear icon for simulation settings is easy to miss in the left sidebar.

- First-time users may not realize there are configurable options
- Important settings like sample count, Position Keep mode, and Wit Variance are hidden
- The settings panel contains both race conditions (track, weather, ground) AND simulation parameters — users may not know to look there

**Current behavior:** Hovering over the sidebar icons shows tooltips, but users need to know to look there first.

**Suggested fix:**

- Add a secondary "Race Settings" or gear button near the track title (e.g., "Kyoto Turf 3000m (outer) (clockwise) ⚙️")
- This provides contextual access — users looking at the track naturally see the settings button
- Keep the sidebar icon for users who learn the layout, but provide discoverability for new users

**Implementation notes:**

- Button could be a small gear icon or "Settings" text link
- Should open the same Race Settings panel that the sidebar icon opens
- Position it to the right of the track title or below it

**File:** Track title component in [`src/modules/racetrack/`](../src/modules/racetrack/) and settings store in [`src/store/settings.store.ts`](../src/store/settings.store.ts)

---

### 5.2 ~~Advanced options need context~~ [P2] ✅ DONE

**Problem:** Options like "Virtual Pacemaker" are powerful but confusing without context.

- What problem does Virtual Pacemaker solve?
- When should users enable/disable it?
- What are the tradeoffs?

**Suggested fix:** Add a brief description or link to documentation for advanced features.

**Resolution:** Reorganized settings into three logical groups:

- **Race Settings panel** - Quick simulation settings (Track, Time of Day, Ground, Weather, Season, presets)
- **Advanced Settings panel** - Technical options (Samples, Seed, Position Keep, Display options, Wit Variance with inline settings)
- **Simulation Mode toggle** - Moved beside track title for better context (Compare, Skill chart, Uma chart)

This separation provides clearer context by grouping related options and making the simulation mode visually connected to what's being simulated.

**File:** Settings panel implementation

---

## 6. Skill Chart Mode

Issues specific to the Skill Chart simulation mode.

### 6.1 "L" unit not explained [P2]

**Problem:** Skill efficacy values show numbers like "41.16 L" but the "L" unit (lengths/bashin) is never defined.

- Users unfamiliar with "bashin" terminology won't understand the unit
- No conversion to meters or other familiar units provided
- Comparing skills is difficult without understanding the scale

**Suggested fix:**

- Add a note above the table: "Values shown in lengths (L). 1 length = 2.5m"
- Or add a tooltip on column headers explaining the unit

**File:** Skill chart table in [`src/modules/simulation/`](../src/modules/simulation/)

---

### 6.2 Negative values in skill efficacy confusing [P2]

**Problem:** Some skills show negative minimum values (e.g., Highlander: -40.94 L). It's unclear what negative efficacy means.

- Does negative mean the skill hurt performance?
- Or does it indicate earlier activation position?
- Users may misinterpret negative as "bad"

**Suggested fix:**

- Add explanation for what negative values represent
- Consider using different terminology if negative doesn't mean "worse"

**File:** Skill chart table in [`src/modules/simulation/`](../src/modules/simulation/)

---

### 6.3 No skill type visual differentiation [P3]

**Problem:** Speed skills, recovery skills, and acceleration skills all appear similar in the table except for icon color.

- Harder to compare skills of the same type
- No grouping or filtering by skill effect type

**Suggested fix:**

- Add a filter/sort option by skill type (Speed, Stamina, Acceleration, etc.)
- Or add a small tag/badge indicating skill type

**File:** Skill chart components

---

## 7. Compare Mode

Issues specific to the Compare simulation mode.

### 7.1 "Spurt Rate" and "Survival Rate" undefined [P2]

**Problem:** The Runner Stats tab shows "Spurt Rate" and "Survival Rate" percentages without explaining what they measure.

- "Spurt Rate: 72.4%" — percentage of runs that achieved max spurt speed?
- "Survival Rate: 39.0%" — percentage of runs finishing with positive HP?
- These are simulator-specific metrics not found in-game

**Suggested fix:**

- Add tooltips explaining each metric:
  - Spurt Rate: "Percentage of simulations where the uma reached maximum spurt speed"
  - Survival Rate: "Percentage of simulations where the uma finished with HP remaining"

**File:** Runner Stats tab in [`src/modules/simulation/tabs/`](../src/modules/simulation/tabs/)

---

### 7.2 Position Keep indicators unexplained [P2]

**Problem:** The track visualization shows abbreviations like "PDMM", "RU", "PU" but these aren't defined.

- Likely means: Pace Down, Rush Up, Pace Up
- Appears on the elevation profile area of the track
- Users unfamiliar with position keep mechanics won't understand

**Suggested fix:**

- Add a legend or tooltip explaining the abbreviations
- Or spell out on first occurrence: "PU (Pace Up)"

**File:** Track visualization in [`src/modules/racetrack/`](../src/modules/racetrack/)

---

### 7.3 Zero duration display for instant skills [P3]

**Problem:** Some skills show "Duration: 0.0m" in the Skills tab (e.g., Swinging Maestro: Start 1321.4m, End 1321.4m, Duration 0.0m).

- May confuse users — did the skill not work?
- Instant-effect skills (like HP recovery) don't have duration but display suggests an error

**Suggested fix:**

- Show "Instant" instead of "0.0m" for zero-duration skills
- Or add a note explaining instant-effect skill display

**File:** Skills tab in [`src/modules/simulation/tabs/`](../src/modules/simulation/tabs/)

---

## What's Working Well ✅

Patterns and implementations that should be maintained and potentially expanded to other areas.

### Clear Explanatory Text

- **Compare Mode results explanation:** "Negative numbers mean Umamusume 1 is faster, positive numbers mean Umamusume 2 is faster" — direct and helpful
- **Stamina warnings:** "Cannot Max Spurt (need +71 stamina)" — actionable feedback

### Consistent Color Coding

- Uma 1 uses green/blue consistently across all tabs
- Uma 2 uses red consistently across all tabs
- This pattern should be maintained throughout

### Detailed Stamina Analysis

The Stamina tab is exemplary:

- Clear warning messages with specific numbers
- "(w/ heals)" annotation distinguishes with/without recovery skills
- Phase Breakdown shows HP consumption per phase visually
- HP bar visualization makes remaining HP intuitive

### Good Statistical Presentation

- Sample Size displayed prominently (e.g., "Sample Size: 500")
- Percentiles provided (5th, 25th, 50th, 75th, 95th) for statistical context
- Win Distribution with visual bars and percentages

### Quick Comparison Section

The "Quick Comparison" cards at bottom of Runner Stats are effective:

- Time Difference, Speed Advantage, Start Delay Diff
- Color-coded to show which uma is better
- Concise summary for at-a-glance comparison

---

## Implementation Notes

### Existing Tooltip Infrastructure

The project already has tooltip components that can be reused:

- [`src/components/ui/tooltip.tsx`](../src/components/ui/tooltip.tsx) - Radix-based tooltip (preferred)
- [`src/components/Tooltip.tsx`](../src/components/Tooltip.tsx) - Custom simple tooltip

### Key Files for Modifications

| Area                   | Primary Files                      |
| ---------------------- | ---------------------------------- |
| Runner stats/aptitudes | `src/modules/runners/components/`  |
| Track visualization    | `src/modules/racetrack/`           |
| Simulation settings    | `src/store/settings/`              |
| Skill display          | `src/modules/skills/components/`   |
| Results display        | `src/modules/simulation/tabs/`     |
| Skill chart mode       | `src/modules/simulation/` (tables) |
| Compare mode tabs      | `src/modules/simulation/tabs/`     |

### Recommended Implementation Order

1. **P1 issues first** — "Run samples" button clarity (1.1)
2. **P2 issues** — Unit explanations (6.1, 6.2), metric definitions (7.1, 7.2), phase legend (2.1), aptitude tooltips (3.1)
3. **P3 issues** — Polish items like skill type filtering (6.3), instant skill display (7.3), label improvements

---

## Changelog

| Date       | Change                                                             |
| ---------- | ------------------------------------------------------------------ |
| 2024-12-04 | Initial document created                                           |
| 2024-12-04 | Resolved 5.2: Reorganized settings into logical panels             |
| 2024-12-04 | Added sections 6 (Skill Chart) and 7 (Compare Mode) — 6 new issues |
| 2024-12-04 | Marked 4.1 as partially resolved                                   |
| 2024-12-04 | Added "What's Working Well" section documenting good patterns      |
