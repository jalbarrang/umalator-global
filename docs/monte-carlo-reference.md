# Monte Carlo Simulation Reference

Comprehensive guide to Monte Carlo methods for race simulation analysis.

## Core Principles

### Definition

Monte Carlo simulation uses repeated random sampling to obtain numerical results. The method relies on:

- **Law of Large Numbers**: Sample mean converges to expected value as N increases
- **Central Limit Theorem**: Distribution of sample means approaches normal distribution
- **Convergence**: Standard error decreases proportionally to `1/sqrt(N)`

### When to Use Monte Carlo

- System has multiple sources of randomness
- Analytical solutions are intractable or unavailable
- Need full distribution of outcomes, not just expected values
- Rare events matter and need quantification
- Comparing scenarios requires statistical confidence

## Random Number Generation

### Pseudo-Random Number Generators (PRNGs)

- Use high-quality PRNGs (Mersenne Twister, PCG, xoshiro)
- JavaScript's `Math.random()` acceptable for non-cryptographic use
- **Always provide seeding mechanism** for reproducibility
- Ensure independent random streams for different components

### Common Distributions

- **Uniform continuous**: `random() * (max - min) + min`
- **Uniform discrete**: `floor(random() * n)`
- **Bernoulli**: `random() < p` for probability `p`
- **Normal**: Box-Muller transform
- **Custom**: Inverse transform sampling

## Sampling Strategies

### Simple Random Sampling

- Each simulation run is independent
- Easiest to implement and parallelize
- Most common approach for race simulations

### Stratified Sampling

- Divide input space into strata, sample each proportionally
- Reduces variance when strata have different characteristics
- Example: Equal samples for each skill activation pattern

### Latin Hypercube Sampling

- Divide each input dimension into equal probability intervals
- Ensures coverage of entire input space
- Useful for sensitivity analysis with fewer samples

### Common Random Numbers (CRN)

- Use identical random seed sequence when comparing scenarios
- Reduces variance in paired comparisons
- Compare skill A vs. B by running same random events

## Statistical Aggregation

### Online (Streaming) Statistics

**Welford's Algorithm** for mean and variance:

```typescript
class OnlineStats {
  private count = 0;
  private mean = 0;
  private m2 = 0;

  update(value: number) {
    this.count++;
    const delta = value - this.mean;
    this.mean += delta / this.count;
    const delta2 = value - this.mean;
    this.m2 += delta * delta2;
  }

  getMean() { return this.mean; }
  getVariance() { return this.m2 / (this.count - 1); }
  getStdDev() { return Math.sqrt(this.getVariance()); }
}
```

**Benefits**: O(1) memory, can run millions of iterations

### Percentile Analysis

- Store all results for exact percentiles (O(N) memory)
- Use approximate algorithms for large N (t-digest, P² algorithm)
- Key percentiles: P50 (median), P25/P75 (quartiles), P90/P95/P99 (tails)

## Confidence Intervals

### For Win Rate (Bernoulli Proportion)

**Wilson Score Interval** (better than normal approximation):

```typescript
function wilsonInterval(wins: number, total: number, confidence = 0.95) {
  const z = 1.96; // 95% confidence
  const p = wins / total;
  const denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const margin = (z / denominator) *
    Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total));
  return { lower: center - margin, upper: center + margin };
}
```

### For Finish Time (Continuous Metric)

**Normal Approximation**:

```typescript
function normalInterval(mean: number, stdDev: number, n: number) {
  const z = 1.96; // 95% confidence
  const stdErr = stdDev / Math.sqrt(n);
  return {
    lower: mean - z * stdErr,
    upper: mean + z * stdErr,
  };
}
```

## Simulation Architecture

### Core Pattern

```
1. Input Generation: Create random inputs for this iteration
2. Deterministic Simulation: Run race with those inputs
3. Result Collection: Record outcomes
4. Repeat N times
5. Statistical Analysis: Aggregate and analyze results
```

**Key Principle**: Keep core simulation **deterministic** given inputs. All randomness in input generation.

### Parallelization

**Web Workers Pattern**:

```typescript
// Distribute work across workers
const workers = Array(navigator.hardwareConcurrency)
  .fill(null)
  .map(() => new Worker('simulation-worker.js'));

workers.forEach((worker, i) => {
  worker.postMessage({
    seed: baseSeed + i * 1000000,
    iterations: iterationsPerWorker,
  });
});

// Aggregate results incrementally
worker.onmessage = (e) => aggregateResults(e.data);
```

**Best Practices**:
- Distribute iterations evenly
- Use different seed ranges to avoid correlation
- Report progress for long-running simulations

## Convergence Detection

### When to Stop

- **Fixed N**: Predetermined iterations (100-100,000 depending on precision needs)
- **Convergence Criteria**: Stop when confidence interval narrow enough
- **Time Limit**: Stop after maximum time budget

### Typical Iteration Counts

- Quick check: 100-1,000
- Standard analysis: 10,000
- High-precision: 100,000+
- Depends on: variance of outcome, required precision, rare events

## Variance Reduction Techniques

### Antithetic Variates

Use negatively correlated samples to reduce variance. For each random U ~ Uniform(0,1), also use 1-U.

### Control Variates

If you know expected value of a related quantity, use deviation to adjust estimate.

### Stratified Sampling

Partition sample space and sample each stratum, ensuring coverage and reducing variance.

### Common Random Numbers

For comparing scenarios A vs B, use identical random seed sequence to reduce comparison variance.

## Memory Management

### Streaming vs. Storage

**Streaming** (O(1) memory):
- Only keep online statistics (mean, variance)
- Can run millions of iterations
- Cannot compute exact percentiles

**Storage** (O(N) memory):
- Keep all results
- Can compute exact percentiles and histograms
- Limited by memory for large N

**Hybrid** (Best of both):
- Use streaming for main statistics
- Store samples (e.g., 1 in 100) for distribution analysis

## Validation Techniques

### Sanity Checks

```typescript
// Physical constraints
assert(result.finishSpeed >= minSpeed, "Speed below minimum");
assert(result.finishSpeed <= 30, "Speed exceeds cap");
assert(result.finishTime > courseDistance / 30, "Impossible time");

// Frame rate validation
assert(result.frames * 0.0666 ≈ result.finishTime, "Frame mismatch");

// Statistical validation
const expectedRate = Math.max(100 - 9000 / baseWit, 20) / 100;
const observedRate = activations / (iterations * skillCount);
// Should be within statistical bounds
```

### Convergence Analysis

Track metrics over time to visualize convergence:

```typescript
const convergencePlot = [];
let cumulativeWins = 0;
for (let i = 0; i < iterations; i++) {
  if (results[i].placement === 1) cumulativeWins++;
  convergencePlot.push({
    iteration: i,
    winRate: cumulativeWins / (i + 1),
  });
}
// Plot should stabilize as iterations increase
```

## Best Practices

### Reproducibility

- Always provide seed parameter
- Use `generateRandomInputs(baseSeed + i)` pattern
- Enables debugging specific runs

### Avoiding Correlation

- Use separate RNG streams for different purposes
- Don't reuse same RNG for unrelated random events

### Handling Rare Events

- Rushed state (10-20% occurrence): Need 100+ iterations for 10+ samples
- Multiple rare skills (e.g., 3 × 5% activation): May need 50k+ iterations
- Consider stratified sampling for rare event analysis

### Comparing Builds

**Use Common Random Numbers**:

```typescript
// Compare skill A vs skill B
for (let i = 0; i < iterations; i++) {
  const inputs = generateRandomInputs(baseSeed + i);

  const configA = { ...baseConfig, skills: [...skills, skillA] };
  const configB = { ...baseConfig, skills: [...skills, skillB] };

  const resultA = runSimulation(configA, raceConfig, inputs);
  const resultB = runSimulation(configB, raceConfig, inputs);

  results.push({ a: resultA, b: resultB });
}

// Paired analysis: much more precise
const aWins = results.filter(r => r.a.placement < r.b.placement).length;
```

**Always report confidence intervals** when comparing:
- "Skill A: 45% ± 2% (95% CI), Skill B: 43% ± 2% (95% CI)"
- If CIs overlap significantly, difference may not be meaningful

## Performance Optimization

1. **Profile before optimizing**: Measure where time is spent
2. **Optimize bottlenecks**: Focus on the slowest parts
3. **Parallelize**: Linear speedup with core count (embarrassingly parallel)
4. **Memory management**: Use streaming for large N, sample for distributions

## Key Metrics to Track

### Primary Outcomes

- Win rate with confidence interval
- Placement distribution: P(1st), P(2nd), P(3rd), etc.
- Top-3 rate (podium finish probability)

### Performance Metrics

- Finish time: Mean, median, P90, P95, P99
- Finish speed distribution
- HP at finish (negative if depleted)

### Race Dynamics

- Skill activation rates and timing
- Position keeping mode frequencies
- Rushed occurrence and duration
- Last spurt speed selected distribution

## References

- See `docs/quick-reference.md` for Uma Musume race mechanics
- See `.cursor/commands/validate-simulation.md` for validation workflow
- See `.cursor/commands/design-monte-carlo.md` for architecture guidance
- See `.cursor/commands/analyze-race-randomness.md` for random variable identification

