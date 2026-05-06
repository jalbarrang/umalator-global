---
version: alpha
name: Racing Form
description: >
  Warm parchment-inspired design system for a fan-made Uma Musume race simulator.
  A trainer's notebook: earthy browns and creams with a single vivid lime-green
  primary, evoking the feel of a well-worn reference in the paddock. Dark mode
  switches to clean neutral charcoal with the lime-green preserved.
colors:
  primary: '#66bf0d'
  primary-dark: '#57a112'
  primary-foreground: '#ffffff'
  secondary: '#e2d8c3'
  secondary-foreground: '#5c4d3f'
  foreground: '#4a3f35'
  muted-foreground: '#7d6b56'
  surface: '#f5f1e6'
  surface-card: '#fffcf5'
  surface-muted: '#ece5d8'
  accent: '#d4c8aa'
  destructive: '#b54a35'
  destructive-foreground: '#ffffff'
  border: '#dbd0ba'
  ring: '#a67c52'
  chart-1: '#a67c52'
  chart-2: '#8d6e4c'
  chart-3: '#735a3a'
  chart-4: '#b3906f'
  chart-5: '#c0a080'
  sidebar: '#ece5d8'
  sidebar-primary: '#a67c52'
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
    backgroundColor: '{colors.primary}'
    textColor: '{colors.primary-foreground}'
    rounded: '{rounded.lg}'
    padding: 0px 10px
    typography: '{typography.label-md}'
    height: 32px
  button-primary-hover:
    backgroundColor: '#72cc0e'
  button-secondary:
    backgroundColor: '{colors.secondary}'
    textColor: '{colors.secondary-foreground}'
    rounded: '{rounded.lg}'
    padding: 0px 10px
    typography: '{typography.label-md}'
    height: 32px
  button-outline:
    backgroundColor: transparent
    textColor: '{colors.foreground}'
    rounded: '{rounded.lg}'
    padding: 0px 10px
    typography: '{typography.label-md}'
    height: 32px
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.foreground}'
    rounded: '{rounded.lg}'
    padding: 0px 10px
    typography: '{typography.label-md}'
    height: 32px
  button-destructive:
    backgroundColor: '{colors.destructive}'
    textColor: '{colors.destructive-foreground}'
    rounded: '{rounded.lg}'
    padding: 0px 10px
    typography: '{typography.label-md}'
    height: 32px
  input:
    backgroundColor: transparent
    textColor: '{colors.foreground}'
    rounded: '{rounded.lg}'
    padding: 4px 10px
    typography: '{typography.body-md}'
    height: 32px
  card:
    backgroundColor: '{colors.surface-card}'
    rounded: '{rounded.xl}'
    padding: 16px
  badge:
    rounded: '{rounded.full}'
    padding: 2px 8px
    typography: '{typography.label-sm}'
    height: 20px
  tooltip:
    backgroundColor: '{colors.foreground}'
    textColor: '{colors.surface-card}'
    rounded: '{rounded.md}'
    padding: 6px 12px
    typography: '{typography.body-sm}'
---

# Racing Form

## Overview

**Creative North Star: "The Trainer's Notebook"**

Racing Form is the design system for **Yet Another Umalator**, a fan-made race and skill simulation toolkit for Uma Musume: Pretty Derby. The UI is data-dense and analytical, serving theorycrafters who compare runner builds, evaluate skill loadouts, and inspect race playback frame by frame.

The visual identity is a **well-worn trainer's notebook**: warm cream paper, dark warm-brown ink, annotations in a crisp hand, and a single vivid green mark that flags the most important thing on the page. Every screen should feel like opening a reference you've dog-eared a dozen times. The density is the point. The warmth keeps it from feeling clinical.

This system explicitly rejects generic SaaS dashboards (bland card grids, hero metrics, navy-and-white corporate surfaces), flashy gacha game UI (neon glows, particle effects, sensory overload), raw spreadsheet dumps (no hierarchy, no focal point), and cluttered game wiki aesthetics (accumulated, never designed). Information architecture is deliberate. Every screen has a reading order.

**Key Characteristics:**
- Precise, playful, approachable. Takes the data seriously and itself lightly.
- Crisp and efficient. Compact controls, minimal padding, every pixel earns its place.
- One-glance insight. The primary answer is visible without interaction.
- Dense but never overwhelming. Hierarchy, spacing rhythm, and tonal contrast prevent clutter.

**Dark mode** is a fully supported alternate theme. It abandons the warm parchment tones in favor of clean neutral charcoals (`#101010` background, `#171717` cards), preserving the lime-green primary. Chart colors switch from warm browns to a cool blue ramp. The same component tokens apply; only CSS custom properties change.

## Colors

The palette is anchored in a warm earthy range with a single vivid lime-green primary reserved exclusively for the most important interactive action per screen.

### Primary
- **Grass Green** (`#66bf0d`): The one punchy color in an otherwise muted palette. Used only for the single highest-priority CTA per view ("Run Simulation", "Add Skill"). Its contrast against parchment creates an immediate focal point. Dark mode shifts to `#57a112` for better contrast against charcoal.

### Secondary
- **Pale Warm Tan** (`#e2d8c3`): Secondary button surfaces, muted containers, and non-primary interactive areas. Reads as slightly textured paper against the parchment ground.

### Neutral
- **Dark Ink Brown** (`#4a3f35`): The body text color. Reads well on all cream and card surfaces while maintaining a natural, inky quality rather than harsh pure-black.
- **Faded Ink** (`#7d6b56`): Subdued text: captions, metadata, placeholder labels, and muted-foreground contexts.
- **Warm Parchment** (`#f5f1e6`): The page background. Sets the entire tonal foundation of the light theme.
- **Cream Paper** (`#fffcf5`): Card and popover surfaces. Near-white with a warm undertone, elevating content slightly above the background without cold white.
- **Warm Linen** (`#ece5d8`): Sidebar panels, activity bars, and muted background regions.
- **Warm Sand** (`#d4c8aa`): Hover states, active navigation items, and selected state backgrounds.
- **Tan Rule** (`#dbd0ba`): Borders, dividers, input outlines. Shared everywhere.
- **Warm Caramel** (`#a67c52`): Focus ring color, visible against all light surfaces. Also the base hue for warm chart colors.
- **Muted Terracotta** (`#b54a35`): Destructive actions and error states. Conveys danger without screaming.

### Chart Ramp (Light)
Five warm-brown steps for data visualization: `#a67c52`, `#8d6e4c`, `#735a3a`, `#b3906f`, `#c0a080`. Dark mode swaps to a cool blue ramp: `#91c5ff`, `#3a81f6`, `#2563ef`, `#1a4eda`, `#1f3fad`.

### Named Rules

**The One Green Rule.** The lime-green primary is used on exactly one action per screen. Its rarity is the point. If you're reaching for green on a second element, use secondary or outline instead.

**The No Pure Black/White Rule.** Never use `#000000` or `#ffffff` as text or background in light mode. Every neutral is tinted toward the brand hue. Dark mode uses `#101010` (background) and `#fafafa` (foreground), both slightly off-axis.

The skill-rarity system uses out-of-band gradient border treatments not expressible as flat color tokens: lavender-to-periwinkle for white skills, white-to-amber for gold skills, pink-to-hot-pink for SR skills, and a rainbow holographic gradient for unique skills. These are defined in CSS (`SkillList.css`) and must not be overridden by component tokens.

## Typography

**Body Font:** Inter Variable (with Noto Sans JP Variable for Japanese characters)
**Mono Font:** Fira Mono

**Character:** Humanist sans-serif at compact sizes, optimized for dense data readability. Inter carries the interface; Noto Sans JP provides complete CJK support for Uma names and skill descriptions sourced from the game. Fira Mono appears wherever numeric precision matters: stat values, frame counts, bassin deltas, SP costs. The pairing is workmanlike, not decorative. A trainer's handwriting: clear, fast, precise.

### Hierarchy
- **Headline Large** (Inter 700, 24px, line-height 1.2, tracking -0.01em): Page titles only. Used sparingly.
- **Headline Medium** (Inter 600, 20px, line-height 1.3): Modal titles, major section headers.
- **Headline Small** (Inter 600, 16px, line-height 1.4): Panel headers, card titles, section dividers. The workhorse heading.
- **Body** (Inter 400, 14px, line-height 1.5): All labels, option text, descriptions, table cell content. The default voice.
- **Body Small** (Inter 400, 12px, line-height 1.5): Captions, tooltips, secondary metadata.
- **Label** (Inter 500, 14px/12px, line-height 1): Button text, badge text, compact UI controls. Slightly heavier weight for scannability.
- **Mono** (Fira Mono 400, 13px, line-height 1.6): Numeric outputs. Bassin values, simulation results, SP costs, frame indices. Monospaced alignment in dense tables.

Japanese text rendered in Noto Sans JP matches the weight and size of its surrounding Inter context. No separate size scale for CJK characters.

### Named Rules

**The Two-Weight Rule.** No more than two font weights (400 and 500/600) appear on a single screen. Headlines earn 600 or 700; body stays at 400; labels split the difference at 500.

**The Mono-for-Numbers Rule.** Every numeric simulation output uses Fira Mono. Proportional fonts cause column misalignment in dense result tables. If it's a number the user compares, it's monospaced.

## Elevation

Depth is expressed through **tonal layering**, not drop shadows. The system is flat by default; shadows are minimal confirmation for floating elements, never the primary depth signal.

Three elevation levels:

1. **Base** — Warm Parchment (`#f5f1e6`). The page floor.
2. **Raised** — Cream Paper (`#fffcf5`). Cards and panels. Slightly lighter than the base, creating a soft lift without a shadow.
3. **Floating** — Cream Paper (`#fffcf5`) with a subtle warm-tinted shadow (`hsl(30 14% 20% / 0.12)`, 2-3px offset). Popovers, dropdowns, tooltips. The shadow confirms that these sit above raised surfaces; it does not create the perception alone.

The shadow vocabulary uses a consistent warm-tinted base (`hsl(30 14% 20%)`) at varying opacities. Dark mode shifts to pure black shadows with lower opacity. All shadows carry a characteristic 2px x-offset (top-right lighting direction), giving floating elements a slight sense of being cast from the upper-left — a subtle nod to printed paper catching light from a desk lamp.

### Shadow Vocabulary
- **2xs / xs** (`2px 3px 5px 0px hsl(30 14% 20% / 0.06)`): Minimal elevation hint. Used sparingly.
- **sm / default** (`2px 3px 5px 0px hsl(30 14% 20% / 0.12), 2px 1px 2px -1px hsl(30 14% 20% / 0.12)`): Standard floating elements.
- **md** (`2px 3px 5px 0px hsl(30 14% 20% / 0.12), 2px 2px 4px -1px hsl(30 14% 20% / 0.12)`): Dropdown menus, popovers.
- **lg** (`2px 3px 5px 0px hsl(30 14% 20% / 0.12), 2px 4px 6px -1px hsl(30 14% 20% / 0.12)`): Sheets, dialogs.
- **xl** (`2px 3px 5px 0px hsl(30 14% 20% / 0.12), 2px 8px 10px -1px hsl(30 14% 20% / 0.12)`): Reserved. Rarely used.

### Named Rules

**The Flat-By-Default Rule.** Cards have no shadow. The background contrast between Warm Parchment and Cream Paper provides sufficient separation. Shadows appear only on floating elements (popovers, dropdowns, tooltips) as confirmation, never as the sole depth signal. Prefer border (`#dbd0ba`) and background contrast to delineate regions.

## Components

### Buttons
- **Shape:** Generously rounded (12px radius, `rounded-lg`). Compact height (32px default). Inline flex with gap for icon + label.
- **Primary:** Grass Green fill, white label. Reserved for the single most important action per view. One primary button per screen context maximum. Hover lightens to `#72cc0e`.
- **Secondary:** Pale Warm Tan fill, dark brown label. Non-critical submit actions and secondary confirmations. Hover darkens to 80% opacity.
- **Outline:** Transparent fill, Tan Rule border, dark brown label. Tertiary actions, toggles, options that recede visually. Hover fills with Warm Linen.
- **Ghost:** No fill, no border. Inline controls, icon buttons, dense layout actions. Hover fills with Warm Linen.
- **Destructive:** Terracotta at 10% opacity background, terracotta text. Hover deepens to 20%. Not a solid terracotta fill — the tint treatment is lighter and less alarming.
- **Sizes:** xs (24px), sm (28px), default (32px), lg (36px). Icon-only variants at each size.
- **Focus:** 3px ring in Warm Caramel (`#a67c52`), offset by border color shift to ring color.

### Badges
- **Shape:** Pill (9999px radius, `rounded-full`). Fixed 20px height. Label Small typography (Inter 500, 12px).
- **Variants:** default (green fill), secondary (tan fill), destructive (terracotta tint), outline (border only), ghost (no fill).
- **Skill rarity badges** use the gradient border CSS system (not flat fills). Four variants: white (lavender → periwinkle), gold (white → amber), pink (pink → hot-pink), unique (rainbow holographic). These gradients are a direct visual reference to in-game rarity presentation and are never overridden.

### Cards
- **Shape:** 16px radius (`rounded-xl`). Ring border (`ring-1 ring-foreground/10`), not a solid `border` token — subtle at light opacities.
- **Background:** Cream Paper (`#fffcf5`). No shadow. Tonal layering provides elevation.
- **Internal padding:** 16px (default), 12px (sm variant).
- **Structure:** Slot-based composition: `card-header`, `card-title`, `card-description`, `card-action`, `card-content`, `card-footer`. Footer uses Warm Linen background with top border.
- **Size variants:** `default` and `sm` via data attribute. `sm` tightens gap and padding.

### Input Fields
- **Shape:** 12px radius (`rounded-lg`). 32px height. Transparent background (light mode) or `input/30` opacity (dark mode).
- **Border:** Tan Rule (`#dbd0ba`) outline at rest. Focus swaps to Warm Caramel ring with 3px ring.
- **Placeholder:** Faded Ink (`#7d6b56`).
- **Error:** Border and ring swap to destructive. 3px destructive-tinted ring.
- **Disabled:** Reduced opacity (50%), `input/50` background, no pointer events.

### Tooltips
- **Shape:** 10px radius (`rounded-md`). Max width `max-w-xs`.
- **Colors:** Dark Ink Brown background, Cream Paper text. Arrow matches background.
- **Animation:** Fade + zoom-in on open, fade + zoom-out on close. Slide from the opposing side.
- **Delay:** Zero delay (via provider default). Data-dense contexts need instant feedback.

### Tabs
- **Two variants:** `default` (filled indicator on active tab, muted background on list) and `line` (bottom border indicator, transparent list background).
- **Active state:** Default variant fills with background color and adds subtle shadow. Line variant shows a 2px foreground-colored bar below (horizontal) or beside (vertical) the active tab.
- **Typography:** Label-md weight (500), 14px. Active tabs use full foreground color; inactive use muted foreground.
- **Orientation:** Supports both horizontal and vertical. Vertical tabs align left with full-width triggers.

### Sidebar
- **Width:** 16rem (desktop), 18rem (mobile sheet), 3rem (collapsed icon-only).
- **Background:** Warm Linen (`#ece5d8`). Dark mode: `#171717`.
- **Keyboard shortcut:** `b` toggles sidebar.
- **Mobile:** Collapses to a slide-in sheet with overlay.

### Scrollbars
- **Track:** Warm Linen background, base radius.
- **Thumb:** Faded Ink, same radius. Hover darkens to foreground.
- **Size:** 8px width and height.

## Do's and Don'ts

### Do:
- **Do** use Grass Green (`#66bf0d`) for exactly one action per screen — the most critical next step. Its rarity creates the focal point.
- **Do** maintain WCAG AA contrast (4.5:1 minimum) for all body and label text. The Dark Ink Brown on Warm Parchment pair meets this threshold.
- **Do** use Fira Mono for all numeric simulation outputs. Proportional fonts cause column misalignment in dense result tables.
- **Do** use the tonal layering system (Warm Parchment → Cream Paper → floating shadow) to express depth. Don't introduce new shadow styles.
- **Do** use Faded Ink (`#7d6b56`) for metadata, captions, and secondary labels. Reserve Dark Ink Brown (`#4a3f35`) for primary readable content.
- **Do** use the compact component sizing (32px buttons, 20px badges). Density is the point; the warmth of the palette prevents it from feeling cramped.
- **Do** keep color-blind-safe chart palettes. Never rely on color alone to distinguish data series; combine with shape, pattern, or label.

### Don't:
- **Don't** apply the lime-green primary to decorative elements, text links, or secondary actions. Green is for the one CTA. Everything else uses secondary, outline, or ghost.
- **Don't** use pure black (`#000000`) or pure white (`#ffffff`) as text or background in light mode. Use the warm palette tokens.
- **Don't** mix rounded-xl corners (cards/panels) with sharp corners in the same view. All interactive surfaces use a rounded token.
- **Don't** use more than two font weights (400 and 500/600) on a single screen.
- **Don't** override the skill rarity gradient border system with flat colors. The gradients are a direct visual reference to in-game rarity presentation and must be preserved.
- **Don't** build anything that looks like a generic SaaS dashboard: bland card grids, hero-metric templates, navy-and-white corporate surfaces. This is a fan tool with character.
- **Don't** import flashy gacha game UI patterns: neon glows, particle effects, or overwhelming visual noise. The game's aesthetic is a reference for warmth, not for sensory overload.
- **Don't** present raw data without hierarchy. Every screen has a clear focal point and reading order. If it looks like a spreadsheet dump, it's failed.
- **Don't** let information architecture feel accumulated like a game wiki. Structure is deliberate, never ad-hoc.
- **Don't** add gradient text (`background-clip: text`), side-stripe borders (colored `border-left` > 1px as accent), or glassmorphism as decoration. Prohibited across the system.
