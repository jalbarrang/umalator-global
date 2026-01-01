# Review Simulation Logic

Review race simulation code for correctness against Uma Musume mechanics.

## Steps

1. **Verify core mechanics**
   - Check stat calculations (speed, acceleration, HP)
   - Validate frame rate (15 FPS, 0.0666s per frame)
   - Confirm position and distance tracking
2. **Check skill implementation**
   - Activation probability matches formula
   - Effects applied correctly (duration, magnitude)
   - Conditions evaluated properly (phase, position, random locations)
3. **Validate race phases**
   - Start delay: 0-0.1s, skill modifications
   - Section transitions: 24 sections, distance-based
   - Last spurt: Wit-based speed selection, HP recovery recalc
   - Finish: Correct placement and timing

## Key Formulas Reference

**Skill Activation**: `max(100 - 9000 / BaseWit, 20)%`
**HP per Frame**: `baseRate * modifier * 0.0666`
**Speed Calculation**: `(BaseSpeed + modifiers) * phaseFactor`
**Section Count**: 24 sections per race
**Frame Rate**: 15 FPS (0.0666s per frame)

## Review Checklist

- [ ] Stats use correct formulas (refer to `docs/quick-reference.md`)
- [ ] Frame rate is 15 FPS (0.0666s per frame)
- [ ] Skill activation uses Wit-based formula
- [ ] Skill effects apply at correct timing (immediate vs next frame)
- [ ] Skill conditions check phase, position, and random locations
- [ ] Start delay handled (0-0.1s base, modified by skills)
- [ ] Section transitions trigger at correct distances (24 total)
- [ ] Last spurt uses Wit-based speed candidate selection
- [ ] Last spurt recalculates on HP recovery
- [ ] HP consumption calculated per frame correctly
- [ ] Position keeping checks use Wit-based probability
- [ ] Rushed state determined pre-race (Wit-based)
- [ ] Finish conditions check distance and placement correctly
- [ ] All random events use appropriate distributions
- [ ] Edge cases handled (HP depletion, speed caps, stat boundaries)

