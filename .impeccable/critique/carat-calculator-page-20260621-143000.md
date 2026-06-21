---
target: "src/modules/carat/components/carat-calculator-page.tsx"
slug: carat-calculator-page
date: 2026-06-21T14:30:00Z
total_score: 28
p0_count: 0
p1_count: 3
---

# Critique — Carat Calculator page

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading/connected/error states + live stats are solid; adding a banner gives no explicit confirmation, and the "688 events loaded" bar over-communicates. |
| 2 | Match System / Real World | 3 | Strong domain language + glossary; the "⬩" carat glyph and "Carats avail." abbreviation stay slightly cryptic. |
| 3 | User Control and Freedom | 3 | Remove, dismiss, sort, drag-reorder present; no undo for remove, no "clear all". |
| 4 | Consistency and Standards | 2 | Settings panel mixes native `<details>` and the `Collapsible` component; tab strip is `aria-pressed` buttons not a real tablist; "Global ▾" shows a caret but isn't interactive. |
| 5 | Error Prevention | 3 | Inputs floored at `min=0`, smart presets; planned-pulls accepts unbounded values. |
| 6 | Recognition Rather Than Recall | 3 | Rich InfoHints, inline suffixes, quick chips — but the table's primary answers (Balance/Odds) sit off-screen. |
| 7 | Flexibility and Efficiency | 3 | Presets, chips, sort, keyboard drag; no shortcuts, no bulk add. |
| 8 | Aesthetic and Minimalist Design | 2 | Four equal-weight stat cards (the hero-metric template), debug-flavored status bar, 1080px-min table; dark mode reads as generic SaaS. |
| 9 | Error Recovery | 2 | Timeline error shows raw `error.message` and offers no retry. |
| 10 | Help and Documentation | 4 | Opt-in tour, first-visit nudge, glossary, contextual hints — genuinely excellent. |
| **Total** | | **28/40** | **Good (low end) — solid bones, but dark mode sheds the brand and nothing claims the eye.** |

## Anti-Patterns Verdict

**LLM assessment:** In the screenshot (dark mode, empty state) this page reads as a generic dark SaaS dashboard — exactly the first anti-reference PRODUCT.md forbids. Two tells: (1) the four equal-weight stat cards are the named "hero-metric template" anti-pattern, and (2) the entire "warm parchment, trainer's notebook" identity is invisible in dark mode. Charcoal `#171717` cards on `#101010` background give almost no tonal separation, so the page is a flat grid of low-contrast boxes with one green button. The `Timeline connected · 688 events loaded` bar reads like leftover debug output on top of the primary work area.

**Deterministic scan:** `impeccable_detect` across all 8 carat component files → No design anti-patterns found. No side-stripe borders, gradient text, font overuse, cramped tracking, or low-contrast tokens. Detector and review agree: token-level craft is clean. Every problem here is layout, hierarchy, IA, and theme.

**Visual evidence:** Provided desktop screenshot (~1320px, dark mode, empty plan). The empty state leaves the right two-thirds of the viewport blank below the "three quick steps" card. Console not re-captured this run (no dev server); prior run reported it clean.

## Overall Impression

The help/onboarding layer is best-in-class for a fan tool and the income panel is dense-but-legible. But two structural problems: nothing claims the eye (four identical cards, the answer card among them carries only a 1px green underline), and dark mode discards the brand (the "trainer's notebook" identity lives in the warm light theme; dark mode collapses into the generic dashboard the product rejects). Biggest opportunity: make the affordability verdict the focal point and give dark mode its own warmth.

## What's Working

1. Help & onboarding — opt-in tour, dismissable first-visit nudge, inline glossary, InfoHints at every jargon point.
2. Self-explaining inputs — selects carry inline contributions, presets seed sane values, quick chips cut typing.
3. Plain-language outcomes — "Short by 6,300 ⬩ — add ~42 pulls" turns a raw deficit into an action.

## Priority Issues

- **[P1] Dark mode sheds the brand identity and reads as generic SaaS.** Flat charcoal cards with one green button. DESIGN.md's warm "trainer's notebook" character is entirely a light-mode property; dark mode preserves only the green primary, and `#101010`→`#171717` is too subtle to separate cards from background.
  - **Fix:** Warm-tinted charcoal ramp (surfaces toward brand hue, not neutral gray), stronger card/background separation, carry a trace of paper warmth.
  - **Suggested command:** `/impeccable colorize`

- **[P1] Four equal-weight cards — the named hero-metric template.** "Balance at last banner" (the verdict) has identical weight to "Current Carats" (an input echo); its only emphasis is a thin green underline.
  - **Fix:** Elevate the affordability verdict to a wide primary panel; demote the three input-echo metrics to a compact secondary strip.
  - **Suggested command:** `/impeccable layout`

- **[P1] Banner table forces page-level horizontal scroll; Balance + Odds clipped.** `min-w-[1080px]` inside the `1fr` grid track pushes the two most decision-relevant columns off the right edge.
  - **Fix:** Responsive re-architecture: prioritize Banner / Carats avail. / Balance / Odds; collapse Window, Paid pool, Cost; stacked per-banner card below `lg`; drop the table `min-width`.
  - **Suggested command:** `/impeccable layout`

- **[P2] "Paid pool" column always renders but shows "—" for the default user.** Paid tracking is off by default; every default user carries a dead column that worsens overflow.
  - **Fix:** Conditionally render the Paid pool column only when `settings.trackPaidCarats` is true.
  - **Suggested command:** `/impeccable distill`

- **[P2] Three onboarding entry points + a debug status bar compete at the top.** "Take a tour" (header), first-visit nudge, and "Take the 60-second tour" (empty state) are three doors to one tour; `Timeline connected · 688 events loaded` is debug noise.
  - **Fix:** Keep one persistent tour entry + the nudge; drop the empty-state third. Remove the events-loaded bar or fold a quiet "Live data" dot into the panel header.
  - **Suggested command:** `/impeccable distill`

## Persona Red Flags

**Alex (Power User):** No keyboard shortcuts for add/remove/sort. One-at-a-time dialog add — a 10-banner plan is 10 round-trips. Balance/Odds require horizontal scrolling. Quick chips respect his speed.

**Sam (Accessibility):** Calculator/Selector strip is `<Button aria-pressed>` not a real tablist. Dark-mode `text-[11px]`/muted helper lines are borderline against 4.5:1 on `bg-card`. Affordability survives color-alone (text-labeled). The 1080px scroll region must be keyboard-reachable.

**The Theorycrafter (project persona):** Arrives wanting "can I afford the next 3 banners?" The answer is split between a same-weight card and an off-screen column — the least emphasized thing on screen, against PRODUCT.md's "answer in under a minute / visible without interaction."

## Minor Observations

- "Global ▾" shows a caret but appears static — wire the menu or drop the caret.
- "⬩" glyph and the word "carats" used interchangeably — pick one, define once.
- Empty state wastes ~60% of the viewport.
- Header title is 21px; the affordability verdict should out-weigh it and currently nothing does.

## Questions to Consider

- What is the single answer this page exists to deliver, and is it the visual focal point?
- Should dark mode carry the trainer's-notebook warmth, or is it intentionally a neutral work mode?
- Does the plan need to be a wide table at all, or would a per-banner card/row layout kill the overflow?
