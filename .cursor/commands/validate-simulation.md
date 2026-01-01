# Validate Simulation

Check Monte Carlo simulation results for correctness and statistical validity.

## Steps

1. **Run sanity checks**
   - Physical constraints (speed limits, minimum times)
   - Frame rate consistency (frames * 0.0666 ≈ time)
   - Stat boundaries (all values within valid ranges)
2. **Verify randomness distribution**
   - Skill activation rates match expected probabilities
   - Section random modifiers within expected ranges
   - Rushed state frequency aligns with Wit-based formula
3. **Check convergence**
   - Plot win rate over iterations (should stabilize)
   - Verify confidence intervals narrow as N increases
   - Ensure sufficient iterations for rare events
4. **Compare against known results**
   - Test with deterministic inputs (should get same output)
   - Validate against game data or other simulators if available

## Key Validation Checks

**Physical Constraints**:
- Finish speed: 0 ≤ speed ≤ 30 m/s
- Finish time: ≥ courseDistance / 30
- Stats: All values in [1, 2000] range

**Statistical Validity**:
- Observed activation rate ≈ `max(100 - 9000/BaseWit, 20)%`
- Standard error decreases proportionally to `1/sqrt(N)`
- Confidence intervals contain expected values

## Validation Checklist

- [ ] Physical constraints satisfied (speed, time, stats)
- [ ] Random event frequencies match expected rates
- [ ] Results converge as iteration count increases
- [ ] Deterministic inputs produce identical outputs
- [ ] Confidence intervals appropriately sized for N
- [ ] Rare events have sufficient sample size

