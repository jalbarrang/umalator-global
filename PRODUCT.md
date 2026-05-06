# Product

## Register

product

## Users

Primarily theorycrafters and optimizer players who min-max Uma Musume builds, compare skill loadouts across race scenarios, and want data-driven decisions before spending in-game resources. They're comfortable with dense data, simulation parameters, and frame-level race analysis.

Secondarily, casual players who want a quick sense of how a build performs. The UI shouldn't intimidate newcomers, but it never dumbs down for them either. Progressive disclosure bridges the gap: power tools are always reachable, beginner-friendly defaults are always present.

Context: users arrive with a specific question ("Is this skill worth equipping?", "Which strategy wins on this course?") and want an answer fast. Sessions are short and goal-directed, not exploratory browsing.

## Product Purpose

Yet Another Umalator is a race and skill simulation toolkit for Uma Musume: Pretty Derby (Global server). It lets players configure race scenarios, run repeatable simulations, compare skill loadouts, and inspect velocity/distance/stamina trends across many runs.

Success looks like: a player can set up a comparison, run it, and read the answer in under a minute. The tool replaces guesswork and in-game trial runs with reliable, reproducible data.

## Brand Personality

**Precise, Playful, Approachable.**

The voice is a knowledgeable friend who happens to love spreadsheets. Numbers are exact, labels are clear, but the tone never feels sterile or corporate. The warm parchment aesthetic and racing-program inspiration give the tool a physical, tactile quality that softens the analytical surface. It takes the data seriously and itself lightly.

## Anti-references

- **Generic SaaS dashboards.** No bland card grids, hero-metric templates, navy-and-white corporate surfaces. This is a fan tool with character, not an enterprise product.
- **Flashy gacha game UI.** No neon glows, particle effects, or overwhelming visual noise borrowed from mobile game interfaces. The game's aesthetic is a reference point for warmth and personality, not for sensory overload.
- **Raw spreadsheet dumps.** No undesigned data tables with zero visual hierarchy. Every screen has a clear focal point and reading order.
- **Game wiki aesthetic.** No cluttered, ad-laden, poorly organized wiki pages. Information architecture is deliberate, not accumulated.

## Design Principles

1. **Dense but never overwhelming.** Pack information tightly, but use hierarchy, spacing rhythm, and tonal contrast so nothing feels cluttered. Every element has breathing room proportional to its importance.
2. **One-glance insight.** The most important answer on any screen is visible without interaction. If the user has to click, scroll, or hover to find the primary result, the layout has failed.
3. **Playful precision.** Exact numbers and data, presented with personality and warmth. Monospaced stat values sit next to friendly labels. The racing-program metaphor keeps things grounded and tactile.
4. **Respect the user's expertise.** No hand-holding for power users. Defaults are smart, but every parameter is accessible. Progressive disclosure for newcomers: guided entry points that open into full control.
5. **Show, don't tell.** Visualize data instead of describing it. Charts over paragraphs, inline previews over separate pages, color-coded comparisons over raw number columns.

## Accessibility & Inclusion

- WCAG AA compliance (4.5:1 contrast minimum for text, 3:1 for UI components).
- Full keyboard navigation for all interactive elements.
- Screen reader support for simulation results and data tables.
- Japanese text (Uma names, skill descriptions) rendered with proper CJK font support via Noto Sans JP.
- Color-blind-safe chart palettes: never rely on color alone to distinguish data series.
