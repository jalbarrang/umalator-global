---
target: "src/modules/carat/components/carat-calculator-page.tsx"
slug: carat-calculator-page
date: 2026-06-21T06:02:30Z
total_score: 29
p0_count: 0
p1_count: 2
---

# Critique — Carat Calculator page

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/connected/error states + live stats are solid; adding a banner gives no explicit confirmation. |
| 2 | Match System / Real World | 3 | Strong domain language + glossary; "⬩" carat glyph and "Carats avail." abbreviation are slightly cryptic. |
| 3 | User Control and Freedom | 3 | Remove, cancel, dismiss, sort, drag-reorder present; no undo for remove, no "clear all". |
| 4 | Consistency and Standards | 3 | Settings panel mixes native `<details>` and the `Collapsible` component; tab strip uses `aria-pressed` not real tab semantics. |
| 5 | Error Prevention | 3 | Number inputs floored/min=0, smart defaults + presets; pulls input accepts unbounded values. |
| 6 | Recognition Rather Than Recall | 3 | Rich InfoHints, inline suffixes, quick chips — but primary outputs (Balance/Odds) sit off-screen by default. |
| 7 | Flexibility and Efficiency | 3 | Presets, chips, sort, keyboard drag; no shortcuts, no bulk/multi-select add. |
| 8 | Aesthetic and Minimalist Design | 2 | 10-column table overflows the viewport; always-on empty "Paid pool" column; debug-flavored "688 events loaded" bar. |
| 9 | Error Recovery | 2 | Timeline error shows raw `error.message` and offers no retry. |
| 10 | Help and Documentation | 4 | Opt-in tour, first-visit nudge, glossary, contextual hints — genuinely excellent. |
| **Total** | | **29/40** | **Good — solid foundation, address the table overflow + hierarchy.** |

## Anti-Patterns Verdict

**LLM assessment:** Not an obvious AI-generated page — it has real character (warm theme, friendly copy, an actual glossary and tour). But two genericness tells: the **four equal-weight stat cards** are exactly the "hero-metric template" PRODUCT.md lists as an anti-reference, and the **wide raw data table** drifts toward the "raw spreadsheet dump" anti-reference. The `Timeline connected · 688 events loaded` bar reads like leftover debug output.

**Deterministic scan:** `impeccable_detect` on all 8 carat component files → **No design anti-patterns found.** No side-stripe borders, gradient text, font overuse, cramped tracking, or low-contrast tokens. The detector and the design review agree the *token-level* craft is clean; the problems are layout/hierarchy/IA, which the detector does not measure.

**Visual evidence:** Desktop (1280px), mobile, populated-table, and empty-state screenshots captured. Console clean (no errors/warnings). The populated table at 1280px pushes **Balance and Odds off the right edge and triggers a page-level horizontal scrollbar.**

## Overall Impression

The onboarding and help layer are best-in-class for a fan tool, and the income/settings panel is dense-but-legible. The page falls down exactly where it matters most: the moment a banner is added, the table — whose whole job is to answer "can I afford this, and what are my odds?" — pushes those two answers off-screen. The biggest opportunity is to make the affordability verdict the page's visual focal point instead of the rightmost, clipped column.

## What's Working

1. **Help & onboarding** — opt-in tour, dismissable first-visit nudge, a glossary, and InfoHints at every jargon point. This is the strongest part of the page and rare to see done this well.
2. **Self-explaining inputs** — selects carry inline contributions ("Class 6 · 375/wk", "SS · 4,500/mo"), presets seed sane values, and quick chips (1 spark / +10 / max) cut typing. Recognition over recall, done right.
3. **Plain-language outcomes** — "Short by 6,300 ⬩ — add ~42 pulls" turns a raw deficit into an action. Excellent copy instinct.

## Priority Issues

- **[P1] Banner table overflows the viewport; Balance + Odds are clipped.** `min-w-[1080px]` on the table inside a CSS grid `1fr` track forces the track wider than the screen, so the page gets a horizontal scrollbar and the two most decision-relevant columns render off-screen at 1280px (worse on mobile).
  - **Why it matters:** Violates the product's core principle "one-glance insight" — the primary answer requires horizontal scrolling to even see. Power users and mobile users both stall here.
  - **Fix:** Re-architect the plan as a responsive layout: prioritize Banner / Carats avail. / Balance / Odds; collapse secondary columns (Window detail, Paid pool, Cost breakdown) into the row or a disclosure; below ~`lg` switch to a stacked per-banner card. Drop the table `min-width` so it never forces page overflow.
  - **Suggested command:** `/impeccable layout`

- **[P1] "Paid pool" column is always rendered but shows "—" for the default user.** Paid tracking is off by default, so every default user carries a dead column that worsens the overflow.
  - **Why it matters:** Pure extraneous load and a direct contributor to the P1 overflow.
  - **Fix:** Conditionally render the Paid pool column (and its cost sub-line) only when `settings.trackPaidCarats` is true.
  - **Suggested command:** `/impeccable distill`

- **[P2] Summary is four equal-weight stat cards with no hierarchy.** "Balance at last banner" (the actual answer) has identical visual weight to "Current Carats" (an input echo). This is the brand's named "hero-metric template" anti-reference.
  - **Why it matters:** Nothing claims the eye; the page reads as a generic dashboard, against PRODUCT.md's explicit guidance.
  - **Fix:** Elevate the outcome card (affordability) as a wider/primary focal element; demote the input-echo cards to a secondary strip.
  - **Suggested command:** `/impeccable layout`

- **[P2] "Timeline connected · 688 events loaded" is debug-flavored noise.** It sits above the plan, competing with real content and offering no user value once loaded.
  - **Why it matters:** Adds visual noise at the top of the primary work area; reads as unfinished.
  - **Fix:** Remove it, or fold a quiet "Live data" status into the panel header.
  - **Suggested command:** `/impeccable distill`

- **[P2] Two disclosure mechanisms in one settings panel + everything open by default.** Native `<details>` (Starting Balance, Recurring Income, CM, Passes) and the `Collapsible` glossary coexist; the first two sections are `open`, making the panel a long scroll.
  - **Why it matters:** Inconsistent interaction model and a tall default footprint that buries the term glossary.
  - **Fix:** Unify on one disclosure component; decide which sections start collapsed (advanced income tables could collapse).
  - **Suggested command:** `/impeccable polish`

## Persona Red Flags

**Alex (Power User):** No keyboard shortcuts for add/remove/sort. Adding banners is one-at-a-time through a dialog — no multi-select or bulk add, so building a 10-banner plan is 10 dialog round-trips. The outputs he cares about (Balance, Odds) require horizontal scrolling to read. The quick chips are the one thing that respects his speed.

**Sam (Accessibility):** The Calculator/Selector tab strip is `<Button aria-pressed>` rather than a real tablist (`role="tab"` + `aria-selected` + arrow-key roving) — a screen reader announces "button, pressed" not "tab, 1 of 2". Affordability is color-coded (emerald/destructive) but is also labeled "Affordable ✓" / "Short by…" in text, so it survives the color-alone test. Check contrast of the `text-[11px]` muted helper lines in dark mode against `bg-card`. The horizontal-scroll table region needs to be keyboard-reachable to read the clipped columns.

**Casey (Distracted Mobile):** The 1080px-min table is the worst-case on a phone — the Balance/Odds answers are a long horizontal scroll away from the banner they describe (the "memory bridge" violation). Quick-chip buttons are `size="xs"`, likely under the 44×44pt touch target. Summary cards stack cleanly (good), and state persists via the store (good). A per-banner stacked card would transform this screen for her.

## Minor Observations

- "Global ▾" in the settings header looks interactive but appears static — either wire the server menu or drop the caret.
- "Carats avail." wraps to two lines in the header; a slightly shorter label or wider min would read cleaner.
- The "⬩" carat glyph is used in copy but the word "carats" is used elsewhere — pick one and define it once.
- Banner `<img alt="">` is acceptable (decorative; the name sits adjacent), but confirm the name is the row's accessible label.

## Questions to Consider

- What is the single answer this page exists to deliver, and is it the visual focal point? Right now affordability is both a same-weight card and an off-screen column.
- Does the plan need to be a wide table at all, or would a per-banner card/row layout read better and eliminate the overflow entirely?
- Should "Paid pool" exist in the UI until the user opts into paid tracking?
- What would a confident version of the summary row look like — one bold verdict instead of four equal cards?
