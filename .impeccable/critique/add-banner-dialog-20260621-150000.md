---
target: "src/modules/carat/components/add-banner-dialog.tsx"
slug: add-banner-dialog
date: 2026-06-21T15:00:00Z
total_score: 26
p0_count: 0
p1_count: 2
---

# Critique — Add Banner dialog

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No result count, no add-confirmation, and active filters are shown by color only (not exposed to assistive tech). |
| 2 | Match System / Real World | 3 | Good domain language (Confirmed/Estimated/Predicted); filter + badge labels render lowercase "character"/"support". |
| 3 | User Control and Freedom | 3 | Esc + close button + per-group "All" resets; no single "Clear filters" and no undo of an add from here. |
| 4 | Consistency and Standards | 2 | Confidence appears two ways (neutral filter chip vs colored badge); badge colors are hardcoded emerald-100/amber-100 off the token system; filter chips lack the aria-pressed/tab semantics used elsewhere. |
| 5 | Error Prevention | 3 | Already-added banners are disabled to prevent duplicates; filters constrain the set. |
| 6 | Recognition Rather Than Recall | 3 | Visible filters, thumbnails, dates, badges; the two unlabeled filter groups dent it. |
| 7 | Flexibility and Efficiency | 2 | cmdk keyboard nav is good, but the dialog closes on every add — no batch-add despite the "Added" affordance. |
| 8 | Aesthetic and Minimalist Design | 3 | Mostly clean; the seven undifferentiated filter chips in one row are the busy spot. |
| 9 | Error Recovery | 3 | CommandEmpty message is clear but offers no recovery action (clear filters). |
| 10 | Help and Documentation | 2 | No inline hint on what Confirmed/Estimated/Predicted mean inside the dialog. |
| **Total** | | **26/40** | **Acceptable — functional, but the filter row and one-at-a-time add need work.** |

## Anti-Patterns Verdict

**LLM assessment:** Not AI slop. Reuses real primitives (Dialog, cmdk Command, Badge) as a deliberate command-palette picker — a good fit for a long list. Warm charcoal from the recent colorize pass carries through; thumbnails add character. The one tell is the flat seven-chip filter row: two filter dimensions (type, confidence) flattened into one undifferentiated wrap — the "wall of options" reflex, not a designed filter bar.

**Deterministic scan:** impeccable_detect on add-banner-dialog.tsx → No design anti-patterns found. The two issues that matter (filter-group IA, close-on-add) are interaction/semantic, invisible to token-level rules. The hardcoded emerald-100/amber-100 confidence colors are an off-system consistency smell the detector doesn't rule on.

**Visual evidence:** Desktop screenshot (dark mode, dialog open). Filters wrap to two lines with identical styling, so the type/confidence boundary is invisible. List rows are well-sized and scannable.

## Overall Impression

A competent command-palette picker: search, filter, scan, add, with nice list rows. Two things hold it back. The filter bar treats two separate questions ("what type?" / "how confident?") as one row of seven look-alike buttons. And the dialog closes after every add, so building a multi-banner plan means reopening, re-filtering, and re-scrolling each time — despite an "Added" badge and disabled state that imply batch-add was intended. Biggest opportunity: keep the dialog open for multi-add.

## What's Working

1. Command-palette pattern fits the task — searchable, keyboard-navigable list (cmdk), Esc to close.
2. List rows are well-composed — thumbnail + name + date + badges, clean proximity grouping, lazy images.
3. Duplicate prevention is built in — already-planned banners are disabled and tagged "Added."

## Priority Issues

- **[P1] Dialog closes after every add — no batch building.** `handleSelect` calls `setOpen(false)` per selection. Adding 6 banners = 6 open/filter/scroll/click cycles, contradicting the "Added"/disabled affordances. Root cause of the prior page critique's "10 dialog round-trips."
  - **Fix:** Keep the dialog open on select; flip the row to "Added" in place, show a running count, add a "Done" button to close. Preserve search/scroll where possible.
  - **Suggested command:** `/impeccable shape`, then `/impeccable polish`.

- **[P1] Two filter dimensions collapsed into one undifferentiated seven-chip row, no active-state semantics.** Type (3) + confidence (4) chips share identical styling and wrap together; no group labels; no aria-pressed/aria-selected.
  - **Fix:** Split into two labeled groups ("Type" / "Confidence") as segmented controls or role="group" with aria-label; add aria-pressed (or a real toggle-group primitive) so selection is announced.
  - **Suggested command:** `/impeccable layout`, with `/impeccable harden` for ARIA.

- **[P2] Confidence colors are hardcoded Tailwind palette values, off the design system.** bg-emerald-100/amber-100 and dark variants bypass the warm tokens and the Badge variants; the same concept is also styled neutrally as a filter chip.
  - **Fix:** Map confidence to tokenized semantic badge variants; reuse the same treatment for filter chips and list badges.
  - **Suggested command:** `/impeccable colorize`, then `/impeccable polish`.

- **[P2] Lowercase "character"/"support" labels** in both the filter chips and the list card_type badge; everywhere else is title-cased.
  - **Fix:** Title-case at the display layer.
  - **Suggested command:** `/impeccable clarify`.

- **[P2] No result count and no recovery in the empty state.** Filtering gives no "N banners" feedback; CommandEmpty offers no way back.
  - **Fix:** Show a count near the search; add a "Clear filters" button in CommandEmpty.
  - **Suggested command:** `/impeccable clarify` / `/impeccable harden`.

## Persona Red Flags

**Alex (Power User):** Add → dialog vanishes → reopen → filters reset to "All" → re-scroll. A 6-banner plan is six round-trips. The "Added" badge he'd track progress with is never visible because the dialog never stays open. cmdk keyboard nav is the one thing that respects him.

**Sam (Accessibility):** Tabs the filter chips and hears seven buttons with no grouping and no active state (selection is color-only, no aria-pressed). Thumbnail alt="" is fine (name adjacent). Confidence survives color-alone (label text present). Dialog focus order is sane.

**Casey (Distracted Mobile):** Seven size="sm" (~28px) filter chips are under the 44px target and packed tightly when wrapped — mis-taps likely one-handed. List rows tap comfortably. Close-on-add + filter reset loses her place on interruption.

## Minor Observations

- Placeholder "Search banner names…" but searchableText also matches characters/support cards — search is broader than the label.
- Confidence filter has four chips where the list shows three kinds.
- No loading/skeleton inside the dialog (acceptable — data resolved before trigger enables).
- Consider showing the banner window/duration in the row for parity with the plan table.

## Questions to Consider

- Should adding a banner keep the dialog open so users build a plan in one pass?
- Do type and confidence need seven equal buttons, or two small labeled segmented controls?
- Should confidence color come from the warm token set rather than raw emerald/amber, in both filter and row?
