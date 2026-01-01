# Analyze Race Randomness

Identify and model random variables that affect Uma Musume race outcomes.

## Steps

1. **Identify random events**
   - Review race mechanics in `docs/quick-reference.md`
   - List all sources of randomness (pre-race, during race, per-section)
   - Note probability formulas and dependencies
2. **Classify by timing**
   - Pre-race: Skill activation, rushed state determination
   - Race start: Start delay (0-0.1s)
   - Per-section: Section random modifiers (24 per race)
   - Mid-race: Last spurt speed selection, position keeping checks
   - Continuous: Downhill mode entry/exit
3. **Model probability distributions**
   - Skill activation: Bernoulli with `p = max(100 - 9000/BaseWit, 20)%`
   - Section random: Uniform in `[MinVariation, MaxVariation]`
   - Rushed state: Bernoulli with Wit-based formula
   - Last spurt: Sequential Bernoulli trials on speed candidates
4. **Identify dependencies**
   - Which random events affect others
   - Which stats influence probabilities (Wit-based checks)
   - When recalculation happens (e.g., last spurt on HP recovery)

## Key Random Variables

**Pre-Race** (once):
- Skill activations (each skill independent)
- Rushed state (Wit-based probability)

**Race Start** (once):
- Start delay: Uniform(0, 0.1s), modified by skills

**Per-Section** (24 times):
- Speed modifier: Uniform(MinVar, MaxVar) based on Wit

**During Race** (conditional):
- Last spurt speed: Wit-based candidate selection
- Position keeping: Wit-based checks every 2s
- Downhill mode: Wit-based entry, fixed exit probability

**Random Conditions** (skill-specific):
- x_random, straight_random, corner_random locations

## Analysis Checklist

- [ ] All random events identified from race mechanics
- [ ] Probability distributions determined for each
- [ ] Timing of random events documented
- [ ] Wit dependencies identified
- [ ] Recalculation triggers noted
- [ ] Reference `docs/quick-reference.md` for formulas

