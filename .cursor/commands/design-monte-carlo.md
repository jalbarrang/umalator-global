# Design Monte Carlo Simulation

Set up Monte Carlo simulation architecture for race outcome analysis.

## Steps

1. **Separate randomness from simulation**
   - Generate all random inputs upfront (skill activations, section modifiers, delays)
   - Keep core simulation deterministic given inputs
   - Use seedable RNG for reproducibility
2. **Structure the simulation loop**
   - Input generation: Create random variables for this iteration
   - Deterministic simulation: Run race with those inputs
   - Result collection: Record outcomes
   - Repeat N times, aggregate results
3. **Choose aggregation strategy**
   - Streaming: Online stats for mean/variance (memory efficient)
   - Storage: Keep all results for percentiles/histograms (memory intensive)
   - Hybrid: Store samples (e.g., 1 in 100) for distribution analysis
4. **Consider parallelization**
   - Use Web Workers (browser) or Worker threads (Node.js)
   - Distribute iterations evenly, use different seed ranges
   - Aggregate results incrementally

## Architecture Pattern

```
for each iteration i:
  inputs = generateRandomInputs(seed + i)
  result = runDeterministicSimulation(config, inputs)
  aggregateResult(result)

return statisticalSummary(aggregatedResults)
```

## Key Design Principles

- **Deterministic core**: Same inputs → same output (enables debugging)
- **Independent streams**: Separate RNG for each random variable type
- **Reproducibility**: Always provide seed parameter
- **Memory aware**: Choose streaming vs. storage based on needs

## Design Checklist

- [ ] Random inputs generated separately from simulation
- [ ] Core simulation is deterministic
- [ ] Seedable RNG implemented for reproducibility
- [ ] Aggregation strategy chosen (streaming/storage/hybrid)
- [ ] Parallelization strategy planned if needed
- [ ] Convergence criteria defined (fixed N or adaptive)

