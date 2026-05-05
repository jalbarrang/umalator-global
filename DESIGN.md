---
version: alpha
name: Racing Form
description: >
  Warm parchment-inspired design system for a fan-made Uma Musume race simulator.
  Earthy browns and creams with a single vivid lime-green primary, evoking
  the feel of a printed Japanese horse-racing program. Dark mode switches to a
  clean neutral charcoal palette with the lime-green primary preserved.
colors:
  primary: "#66bf0d"
  primary-dark: "#57a112"
  secondary: "#e2d8c3"
  neutral: "#4a3f35"
  neutral-mid: "#7d6b56"
  surface: "#f5f1e6"
  surface-card: "#fffcf5"
  surface-muted: "#ece5d8"
  accent: "#d4c8aa"
  destructive: "#b54a35"
  border: "#dbd0ba"
  ring: "#a67c52"
  on-primary: "#ffffff"
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
    lineHeight: 1.3
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.4
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.5
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0.01em
  mono:
    fontFamily: Fira Mono
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: 8px
  md: 10px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 64px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    typography: "{typography.label-md}"
  button-primary-hover:
    backgroundColor: "#72cc0e"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    typography: "{typography.label-md}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    typography: "{typography.label-md}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    typography: "{typography.label-md}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 8px 16px
    typography: "{typography.label-md}"
  input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.sm}"
    padding: 8px 12px
    typography: "{typography.body-md}"
  card:
    backgroundColor: "{colors.surface-card}"
    rounded: "{rounded.lg}"
    padding: 16px
  badge:
    rounded: "{rounded.full}"
    padding: 2px 8px
    typography: "{typography.label-sm}"
  tooltip:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.sm}"
    padding: 4px 8px
    typography: "{typography.body-sm}"
---

# Racing Form

## Overview

Racing Form is the design system for **Yet Another Umalator** — a fan-made race and skill simulation toolkit for Uma Musume: Pretty Derby. The UI is data-dense and analytical, serving theorycrafters who need to compare runner builds, evaluate skill loadouts, and inspect race playback frame by frame.

The visual identity draws from the **printed Japanese horse-racing program** (競馬新聞): warm cream paper, dark warm-brown ink, and a single vivid accent color that snaps the eye to the most important action on screen. The result is a tool that feels precise and purposeful — like a reference manual — without sacrificing warmth or approachability.

**Personality:** Expert, focused, warm. Dense without being overwhelming.

**Dark mode** is a fully supported alternate theme. It abandons the warm parchment tones entirely in favor of clean neutral charcoals (`#101010` background, `#171717` cards), preserving the lime-green primary. Chart colors switch from warm browns to a cool blue ramp. The same component tokens apply; only the CSS custom properties change.

## Colors

The palette is anchored in a warm earthy range — creams, tans, and browns — with a single vivid lime-green primary reserved exclusively for the most important interactive action per screen.

- **Primary (`#66bf0d`):** Grass/lime green. The one punchy color in an otherwise muted palette. Used only for the single highest-priority CTA per view (e.g., "Run Simulation", "Add Skill"). Its contrast against the parchment ground creates an immediate focal point.
- **Secondary (`#e2d8c3`):** Pale warm tan. Used for secondary button surfaces, muted containers, and non-primary interactive areas.
- **Neutral (`#4a3f35`):** Deep warm brown. The body text color. Reads well on all cream and card surfaces while maintaining a natural, inky quality rather than harsh pure-black.
- **Neutral Mid (`#7d6b56`):** Medium warm brown. Used for subdued text: captions, metadata, placeholder labels, and muted-foreground contexts.
- **Surface (`#f5f1e6`):** Warm parchment cream. The page background. Sets the entire tonal foundation of the light theme.
- **Surface Card (`#fffcf5`):** Near-white with a warm undertone. Elevates card and popover surfaces slightly above the background without a cold white.
- **Surface Muted (`#ece5d8`):** Light warm beige. Used for sidebar panels, activity bars, and muted background regions.
- **Accent (`#d4c8aa`):** Warm sand. Used for hover states, active navigation items, and selected state backgrounds.
- **Destructive (`#b54a35`):** Muted terracotta red. Conveys danger without screaming. Used for destructive actions and error states.
- **Border (`#dbd0ba`):** Warm tan border. Shared across inputs, dividers, and card outlines.
- **Ring (`#a67c52`):** Warm caramel. The focus ring color, visible against all light surfaces.

The skill-rarity system uses an out-of-band gradient border treatment not expressible as flat color tokens: lavender-to-periwinkle for white skills, white-to-amber for gold skills, pink-to-hot-pink for SR skills, and a rainbow holographic gradient for unique skills. These are defined in CSS and should not be overridden by component tokens.

## Typography

All text is set in **Inter Variable** — a humanist sans-serif with excellent legibility at small sizes. **Noto Sans JP Variable** is loaded alongside it as a fallback, providing complete Japanese character support for Uma names and skill descriptions sourced directly from the game. **Fira Mono** is used wherever numeric precision matters: stat values, frame counts, bassin deltas, SP costs.

The UI is intentionally compact. Most interface text runs at `body-md` (14px/Inter 400). Section titles and panel headers step up to `headline-sm` (16px/600). Only modal titles and page-level headings reach `headline-md` or above.

- **Headlines:** Inter Semi-Bold or Bold. Used sparingly — panel headers, modal titles, page titles. Never decorative.
- **Body:** Inter Regular at 14px. The workhorse. Covers all labels, option text, descriptions, and table cell content.
- **Labels:** Inter Medium at 12–14px. Used for button text, badge text, and compact UI controls where a slightly heavier weight aids scannability without taking up extra space.
- **Mono:** Fira Mono Regular at 13px. Used for numeric outputs — bassin values, simulation results, SP costs, frame indices — where monospaced alignment aids readability in dense tables.

Japanese text rendered in Noto Sans JP should match the weight and size of its surrounding Inter context. No separate size scale is applied for CJK characters.

## Layout

The application uses a **sidebar + main panel** layout. A collapsible left sidebar houses runner configuration panels. The main area adapts based on the active route: a two-column compare view for simulation, a full-width track visualization for racetrack inspection, and a centered single-column layout for the skill planner.

Spacing follows a **4px base unit** (the Tailwind default `spacing` scale). All padding, margin, and gap values are multiples of 4px. The most common internal component padding is `sm` (8px) to `md` (16px). Card internal padding is consistently `md` (16px). Panel sections use `lg` (24px) vertical rhythm between groups.

The sidebar uses a fixed width on desktop and collapses to a slide-in sheet on narrow viewports. The racetrack visualization is a responsive SVG that fills its container width.

## Elevation & Depth

Depth is expressed through **tonal layering**, not traditional drop shadows. The three elevation levels are:

1. **Base** — The parchment `surface` (`#f5f1e6`). The page floor.
2. **Raised** — Card surfaces (`#fffcf5`). Slightly lighter than the base, creating a soft lift without a shadow.
3. **Floating** — Popovers, dropdowns, and tooltips. Same `#fffcf5` surface, accompanied by a very subtle warm-tinted shadow (`hsl(30 14% 20% / 0.12)` with a 2–3px offset). This minimal shadow indicates that floating elements sit above raised surfaces.

Avoid using elevation as a primary communication tool. Prefer border (`#dbd0ba`) and background contrast to delineate regions. The shadow is decorative confirmation, not the primary signal.

## Shapes

The shape language is **Generously Rounded**. The base corner radius is `lg` (12px), applied to cards, dialogs, panels, and dropdowns. Buttons and inputs use `md` (10px) — slightly tighter to feel clickable and form-like. Badges and chips use `full` (9999px) for a pill shape. No sharp (0px) corners are used anywhere in the UI.

This rounding level is deliberately high for a data tool — it softens the otherwise dense, analytical surface and gives the app a friendly, accessible character consistent with the game's kawaii aesthetic origins.

## Components

### Buttons

Four variants are used, each with a distinct semantic role:

- **Primary (`button-primary`):** Lime-green fill, white label. Reserved for the single most important action per view. One primary button per screen context maximum.
- **Secondary (`button-secondary`):** Warm tan fill, dark-brown label. Used for secondary confirmations and non-critical submit actions.
- **Outline (`button-outline`):** Transparent fill with `border` border. Used for tertiary actions, toggles, and options that should recede visually.
- **Ghost (`button-ghost`):** No fill, no border. Used for inline controls, icon buttons, and actions embedded in dense layouts where a visible border would add clutter.
- **Destructive (`button-destructive`):** Terracotta fill, white label. Used exclusively for irreversible destructive actions (delete, reset, clear).

All buttons use `label-md` typography (Inter 500, 14px) and `rounded.md` (10px). Icon-only buttons use a square sizing variant and `rounded.md`.

### Input Fields

Text inputs use the `surface-card` background with a `border` (`#dbd0ba`) outline, transitioning to the `ring` (`#a67c52`) caramel focus ring on focus. Placeholder text uses `neutral-mid`. Error state swaps the border and ring to `destructive`. All inputs are `rounded.sm` (8px).

### Cards

Cards use `surface-card` (`#fffcf5`) with a `border` outline and `rounded.lg` (12px) corners. Internal padding is `md` (16px). Card headers use `headline-sm` typography. No shadow is applied to cards; the background contrast against `surface` provides sufficient separation.

### Badges

Pill-shaped (`rounded.full`) with `label-sm` typography. Used for skill rarity indicators, strategy labels, and status chips. The five rarity variants (white, gold, pink, unique) use the gradient border CSS system, not flat background fills.

### Tooltips

Dark (`neutral` background, white text) with `rounded.sm` and tight `body-sm` (12px) text. Appear on hover with no delay for data-dense contexts (stat values, skill descriptions). Maximum width 280px; content wraps freely.

### Tabs

Two variants: `default` (filled indicator on active tab) and `line` (bottom border indicator). `line` variant is preferred for secondary navigation within panels. Active tab label uses `neutral` at full opacity; inactive tabs use `neutral-mid`.

## Do's and Don'ts

- Do use `primary` (`#66bf0d`) for exactly **one** action per screen — the most critical next step.
- Don't apply the lime-green primary to decorative elements, text links, or secondary actions.
- Do maintain WCAG AA contrast (4.5:1 minimum) for all body and label text. The `neutral`-on-`surface` pair already meets this threshold.
- Don't use pure black (`#000000`) or pure white (`#ffffff`) as text or background colors in light mode — use the warm palette tokens.
- Do use `Fira Mono` for all numeric simulation outputs. Proportional fonts cause column misalignment in dense result tables.
- Don't mix `rounded.lg` corners (cards/panels) with sharp corners in the same view. All interactive surfaces must use a rounded token.
- Do use the `neutral-mid` color for metadata, captions, and secondary labels — not `neutral`. Reserve `neutral` for primary readable content.
- Don't use more than two font weights (`400` and `500`/`600`) on a single screen.
- Do use the tonal layering system (surface → surface-card → floating shadow) to express depth. Don't introduce new shadow styles.
- Don't override the skill rarity gradient border system with flat colors. The gradients are a direct visual reference to in-game rarity presentation and must be preserved.
