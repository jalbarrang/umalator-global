# Changelog

All notable changes to this project are documented in this file.

## 0.5.0-beta.2 - 2026-04-01

- Added result actions to Skill Planner optimization rows so non-baseline builds can be saved directly to Veterans or sent to Compare slots (Uma 1 / Uma 2).
- Added Skill Planner to Compare transfer flow that applies a full runner snapshot (stats, aptitudes, outfit, and selected skills) with toast feedback and no forced navigation.
- Updated the shared save modal to support hiding the link checkbox, and reused it from Skill Planner for notes-required Veterans saves.

## 0.5.0-beta.1 - 2026-03-31

- Introduced the Race Sim Beta experience with a new top-down race view as the primary visualization mode.
- Added on-track markers and map interactions to inspect runner positions and pacing over time.
- Added race-sim specific UX polish for beta rollout, including a dismissible "Work in progress" notice.
- Persisted simulation notices in UI state so compare and race-sim disclaimers stay dismissed across sessions.

## 0.4.4 - 2026-03-28

- Added compare result share card: copy a screenshot of the active runner alongside simulation stats (finish time, top speed, spurt/survival rates, etc.).
- Added share runner card.
- Added copy json button to compatible format to RosterView and Kachi's Umalator.

## 0.4.3 - 2026-03-28

- Added automated game data update workflow via GitHub Actions.
- Added more CM presets (credits to gametora).
- Fixed runner not spurting properly.
- Fixed skill lookup map.
- Removed selected skills list panel.
- Show preview of simulation results without waiting for full load.
- Re-render optimizations across multiple components.
- Updated dependencies and removed unused ones.

## 0.4.2 - 2026-03-16

- Refactored skill management: removed master-mdb sync, skills data is now the source of truth.
- Added skill versions and skill owners.
- Fixed corner-random OR behavior for Swinging Maestro skill activation.
- Fixed surface skill not being set as obtained.
- Fixed skill planner combinations.

## 0.4.1 - 2026-03-12

- Added automatic database updater with feature flag to disable it.
- Added SP costs display on runner cards.
- Added stamina drain overrides in advanced settings panel.
- Fixed course data not adding slopes on course 2.
- Fixed Vite worker format to ES for code-splitting build.
- Fixed database fetching with a guard to prevent errors.

## 0.4.0 - 2026-03-05

- Refactored racetrack rendering with improved slope rendering, position markers, and skill activation display.
- Improved tooltip tracking and positioning on the race track.
- Better skill overlap rendering on race track lanes.
- Added polyfills and PostHog analytics for browser compatibility.
- Fixed color format compatibility (downgraded to hex).

## 0.3.1 - 2026-02-28

- Fixed an UI issue on Skill activation list.
- Fixed an issue that compare run didn't use the forced skill positions properly.
- Fixed an issue where Skill Planner was displaying base cost instead of the net cost (after discounts).
- Fixed an issue where all simulators were wrongly getting the bassin value from the first runner instead of the second one at the end of the race.

## 0.3.0 - 2026-02-28

- Added Diamond indicators for Recovery Skills and Debuffs they are also movable and can be used to force skill positions.
- Added new Panel: "Force Skill Positions" that unifies the way to edit and clear skill positions for both runners.
- New page: "Skill Planner" that let's you optimize skill combinations for a given runner and budget.
- Refactor SkillItem component to remove the old input field and added a "Help" button that shows the skill details in a popover.
- Each Skill Popover now shows a translated version of the skill conditions and effects.
- Fixed an issue that compare run didn't use the forced skill positions.

## 0.2.3 - 2026-02-27

- Work in progress on refactoring the simulation library with a focus on separating the Race and Runner logic

## 0.2.2 - 2026-01-02

- Work in progress on the skill planner to add a new compare in vacuum mode that tests possible skill combinations.

## 0.2.0 - 2025-12-06

- [Runners] Added Copy and Swap buttons to runner cards for quick data transfer between Uma 1 and Uma 2
- [Runners] Added tab system in Runners panel to switch between Uma 1, Uma 2, and Pacer (when virtual pacemaker is enabled)
- [Runners] Added uma selector for Skill Chart and Uma Chart modes - choose which uma to use as the simulation base
- [Runners] Skills and uma changes from chart results now apply to the selected target uma
- [UI] Runners panel now uses tabs in all modes - only one runner card is shown at a time for cleaner interface
- [UI] Tab colors match uma colors: blue for Uma 1, red for Uma 2, green for Pacer
- [Runners] Random placeholder mob image is now persistent per runner and no longer changes when switching tabs

## 0.1.9 - 2025-12-06

- [Simulation] Each simulation mode (Compare, Skill chart, Uma chart) now retains its own data independently
- [Simulation] Switching between modes no longer requires re-running simulations

## 0.1.8 - 2025-12-05

- [UI] Moved the tooltip to the top left of the race track
- [Skill Chart] Updated to use Shadcn UI components
- [Skill Chart] Added a loader when the skill chart is loading

## 0.1.7 - 2025-12-05

- [UI] Fixed mobile scrolling - content can now be scrolled on mobile devices
- [UI] Fixed sidebar to be responsive - full width on mobile, 450px on desktop
- [UI] Fixed header buttons to show icons only on mobile screens
- [UI] Fixed runner card grids to be single column on mobile for better usability

## 0.1.6 - 2025-12-05

- [Simulation] Enabled Dueling (Compete Fight) mechanic on the final straight
- [Simulation] Fixed Dueling to properly check proximity (distance < 3m, lane < 0.25), top 50% placement, and speed gap < 0.6 m/s
- [Simulation] Fixed Dueling target speed exponent from 0.709 to 0.708 per race mechanics spec
- [Simulation] Fixed Lead Competition (Spot Struggle) to check lane gap proximity (Front Runner: 0.165, Oonige: 0.416)

## 0.1.5 - 2025-12-05

- [Stamina] Added tracking for stamina debuffs received from opponents
- [Stamina] Added separate display for recovery skills (green) and debuffs received (red)
- [Stamina] Added theoretical debuff estimation based on opponent equipped skills
- [Stamina] Added net HP effect display when both heals and debuffs are present
- [Stamina] Added per-phase debuff breakdown in Phase Breakdown section
- [Stamina] Fixed debuffs from opponents not being tracked or displayed for the affected runner
- [Stamina] Fixed HP calculations not accounting for incoming debuffs
- [Technical] Added debuffsReceived field to simulation data structure
- [Technical] Updated skill tracking to separately record debuffs by affected runner

## 0.1.4 - 2025-12-05

- [Runner] Added OCR Import feature (WIP) to extract uma data from screenshots using Tesseract.js
- [Runner] Import dialog with drag-and-drop file upload and image previews
- [Runner] Auto-detection of Uma identity (outfit name + uma name) with manual selection fallback
- [Runner] Auto-extraction of stats (Speed, Stamina, Power, Guts, Wisdom) with inline editing
- [Runner] Fuzzy matching for skill names against the skill database
- [Runner] Ability to remove incorrectly detected skills before applying
- [Runner] Image preprocessing (grayscale, threshold) to improve OCR accuracy
- [Runner] Fixed inherited unique skills showing as original version in OCR import
- [Technical] Refactored runner data lookups into dedicated search module with fuzzy matching utilities
- [Technical] Split OCR functionality into modular files (parser, stats, uma, skills)

## 0.1.3 - 2025-12-04

- [UI] Added empty states to simulation result tabs (Distribution, Runner Stats, Skills) with contextual guidance
- [Simulation] Added toggle to switch between Theoretical and Actual data in Stamina tab after running a simulation
- [Simulation] Added theoretical recovery skill estimation based on equipped skills and phase conditions
- [Technical] Refactored Stamina tab into modular hooks (useStaminaAnalysis, useRecoverySkills, usePhaseHp) and presentation components

## 0.1.2 - 2025-12-04

- [UI] Reorganized settings into separate panels: Race Settings (track/weather) and Advanced Settings (simulation options)
- [UI] Moved Simulation Mode toggle (Compare/Skill chart/Uma chart) beside track title for better context
- [UI] Integrated Wit Variance settings inline in Advanced Settings panel
- [UI] Removed Wit Variance modal in favor of inline settings

## 0.1.1 - 2025-12-04

- [UI] Added a "Race Settings" button next to the track title for easier access to the settings panel

## 0.1.0 - 2025-12-04

- [App] Initial release of Umalator Global
- [Simulation] Added post simulation Stamina calculator for both runners
- [UI] Started new UI design for easier use
- [UI] Revamped the skill list into a skill picker modal for quick skill selection
- [Technical] Refactored all UI code from Preact to React
- [Technical] Added Shadcn UI components to the project for consistent styling
