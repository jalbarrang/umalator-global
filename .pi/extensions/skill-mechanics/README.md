# Skill Mechanics Extension

Pi tools for inspecting raw skill mechanics in the Umamusume simulation engine.

## Tools

### `inspect_skill`

Inspect a skill's raw mechanical data: effect types, modifiers, targets, baseDuration, and debuff classification.

```
inspect_skill(skillId: "201151")
→ 201151 Dominator [Gold] group:20115 cost:170
    condition: distance_type==3&phase_random==2&order_rate>50
    baseDuration: 30000 (3s)
    effect: Current Speed (21) modifier:-2500 target:All (others only) [duration, external, DEBUFF]
```

### `estimate_skill_duration`

Estimate a skill's effect duration in meters for a given course distance. Uses the engine's `baseDuration / 10000 × (courseDistance / 1000)` scaling formula.

```
estimate_skill_duration(skillId: "201151", courseDistance: 2200)
→ baseDuration: 30000 → 3s base → 6.60s scaled → ~132m
```

### `classify_skill_effects`

Classify a skill's effects by category: instant vs duration, self vs external, buff vs debuff.

```
classify_skill_effects(skillId: "201161")
→ 201161 Mystifying Murmur — injectable debuff: YES
    traits: has-instant, has-external
    instant-external: Recovery -350 ← DEBUFF
```

## When to use

- **`inspect_skill`** — When investigating how a skill works at the engine level (modifiers, targets, durations)
- **`estimate_skill_duration`** — When estimating how far a skill effect spans on the racetrack for a specific course
- **`classify_skill_effects`** — When determining if a skill is a debuff, whether effects are instant/duration, or how they're targeted
- **`search_skills`** (existing) — When looking up skills by name, type, group, conditions, or family
