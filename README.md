# Umalator-Global User Guide

## Introduction

**Umalator-Global** is a comprehensive race simulator for Uma Musume: Pretty Derby (Global version). It allows you to simulate races with various conditions, test skill efficacy, and analyze race performance through detailed statistical analysis and visualization.

The simulator implements nearly all relevant game mechanics and has been battle-tested for accuracy. Use it to:

- Compare different skill builds and configurations
- Understand skill activation patterns and effectiveness
- Optimize your uma musume's performance for specific race conditions
- Analyze race dynamics with velocity charts and histograms

## Key Features

### Race Simulation Modes

#### Standard Simulation

Run Monte Carlo simulations with RNG sampling to see the statistical distribution of race outcomes. Configure the number of samples (default: 500) to balance accuracy with computation time.

#### Skill Chart Mode

Test and compare individual skills to see their effectiveness on a specific course. The tool will:

- Show activation locations on the course
- Display skill length statistics (min, median, mean, max)
- Provide histograms of activation patterns
- Allow direct comparison between skills

### Advanced Features

**Position Keep Modes:**

- **Approximate**: Disables RNG factors for raw skill length comparisons without variance
- **Enhanced**: Full simulation with RNG and realistic position-keeping behavior

**Wit Variance**: Toggle intelligence-based randomness in skill activations

**Virtual Pacemaker**: Simulate racing against a pacemaker for optimization analysis

**Downhill Mechanics**: Includes downhill speed-up mode with 60% HP consumption reduction

**Spot Struggle**: Simulates the spot struggle mechanic when multiple front runners are close together (within 3.75m, 5m for Runaway)

**Lane Movement**: Basic simulation of lane movement for skills like Dodging Danger and Prudent Positioning

## Using the Simulator

### 1. Select Your Course

**Track Selection:**

- Choose from all available race courses in the game
- Distance, track type, and terrain are automatically set

**Race Conditions:**

- **Weather**: Sunny, Cloudy, Rainy, Snowy (click weather icons)
- **Ground Condition**: Firm, Good, Soft, Heavy (dropdown menu)
- **Season**: Spring, Late Spring, Summer, Autumn, Winter (click season icons)
- **Time of Day**: Noon, Evening, Night (click time icons)

These conditions affect which skills activate and their effectiveness.

### 2. Configure Your Uma Musume

**Stats:**
Enter your uma musume's stats (after all bonuses and support effects):

- **Speed**: Base running speed
- **Stamina**: Determines HP pool and stamina consumption
- **Power**: Affects acceleration and hill climbing
- **Guts**: Affects performance when stamina is low
- **Wit**: Affects skill activation rates and randomness

**Running Style:**

- Runaway
- Front Runner
- Pace Chaser
- Late Surger
- End Closer

**Motivation (Mood):**

- Very Bad (-20%)
- Bad (-10%)
- Normal (0%)
- Good (+5%)
- Excellent (+10%)

### 3. Add Skills

**Selecting Skills:**

1. Click "Add Skill" to open the skill selector
2. Use the language toggle (EN/日本語) to switch between English and Japanese skill names
3. Search or browse through skills
4. Click a skill to add it to your uma musume

**Skill Management:**

- Click the skill icon to view detailed information
- Use the X button to remove a skill
- Double-click rows in the skill efficacy table to add skills quickly
- Debuff skills can be selected multiple times to simulate multiple debuffers

**Force Skill Activation:**
Some skills allow you to force activation at specific distances (useful for testing scenarios like Professor of Curvature on straights).

### 4. Configure Simulation Parameters

**Number of Samples:**

- Default: 500 runs
- Higher values = more accurate statistics but longer computation time
- Lower values = faster results but more variance

**Random Seed:**

- Controls the random number generator
- Same seed = reproducible results
- Change seed to test different random scenarios

**Position Keep Mode:**

- **Approximate**: Best for comparing raw skill lengths without RNG
- **Enhanced**: Full realistic simulation with all game mechanics

**Wit Variance:**

- ON: Includes wit-based randomness (realistic)
- OFF: Removes wit-based variance (for pure comparisons)

**Virtual Pacemaker:**

- Enable to race against a simulated pacemaker
- Configure pacemaker strategy and stats

### 5. Run the Simulation

Click the **"Run Simulation"** button (or equivalent action in the interface) to start. The simulation runs in a background thread to keep the interface responsive.

### 6. Interpret Results

#### Velocity Chart

- **X-axis**: Distance along the course (meters)
- **Y-axis**: Velocity (m/s)
- **Colored lines**: Individual simulation runs
- **Bold line**: Selected run or average
- **Shaded regions**: Course sections (corners, slopes)
- **Skill markers**: Show when and where skills activate

**Reading the Chart:**

- Higher velocity = faster running
- Drops in velocity indicate corners or stamina depletion
- Skill markers show activation locations
- Drag skill markers to force activation at specific distances (experimental)

#### Skill Efficacy Table

Shows statistical data for each skill:

- **Min**: Minimum skill length across all runs
- **Median**: Middle value (50th percentile)
- **Mean**: Average skill length
- **Max**: Maximum skill length across all runs
- **Activation Rate**: How often the skill activates

**Interacting with the Table:**

- Click a row to visualize that run on the course chart
- Click skill icons to see detailed skill information and histograms
- Use radio buttons in headers to select which statistic to display on chart
- Double-click to add skills to your uma musume

#### Histograms

When clicking skill icons in the efficacy table:

- Shows the distribution of skill activation lengths
- X-axis: Skill length in meters
- Y-axis: Frequency of occurrence
- Helps understand skill consistency vs variability

#### Spurt/Stamina Survival Rate

Shows the probability of successfully completing the spurt phase without running out of stamina.

## Important Caveats

The simulator is highly accurate but has some limitations:

### Spot Struggle Simplification

Spot Struggle ignores the `LaneGap` activation condition and is based solely on distance between umas. Due to the difficulty of accurately simulating lane movement, Spot Struggle activates when two or more Front Runner umas are within 3.75m of one another (5m for Runaway).

Lane movement is simulated approximately for the purpose of determining the effectiveness of lane movement skills post-1st anniversary, but is not accurate enough for mechanics like Spot Struggle and Dueling in all cases.

### Early-Race Lane Movement

Early-race lane movement is simulated approximately as this mechanic depends on other umas in the race (overtake targets, blocking). The tool uses logic from the mee1080 race simulator to approximate lane movement for observing lane movement skills' effects.

### Pseudo-Random Skills

Skills based on the location of other umas use best-effort estimation for the distribution of activation locations. These may not be perfectly reflective of in-game behavior in all circumstances.

Skills with conditions requiring you to be blocked, or based on other umas in proximity, are modeled with statistical distributions intended to simulate in-game behavior. They should find the correct minimum and maximum, but reported mean/median should be taken with a grain of salt.

Skills with `_random` in the condition name (e.g., `phase_random`, `corner_random`, `straight_random`) are implemented identically to in-game logic and have more accurate mean/median values.

### Skill Cooldowns Not Implemented

Skills only activate once even if they have a cooldown like Professor of Curvature or Beeline Burst.

### Unique Skill Scaling

Unique skill scaling with levels is not implemented. Unique skills are always simulated as base level 3★ unique.

### Duels

Duels have not yet been implemented in the current version.

## Tips for Accurate Simulations

1. **Turn off Wit Variance and use Approximate Position Keep** for raw skill length comparisons without RNG factors

2. **Use higher sample counts (1000+)** when you need more precise statistics

3. **Consider race density**: Skills with "blocked" conditions perform differently depending on the number of umas in the race

4. **Test multiple scenarios**: Change race conditions, mood, and seeds to understand variability

5. **Cross-reference with in-game results**: The simulator is very accurate but real races have additional variables

6. **Use Skill Chart Mode** to understand individual skill behavior before building complete skill sets

7. **Pay attention to stamina**: Ensure your uma musume has enough stamina to complete the spurt phase - check the survival rate

## Development

For developers working on Umalator-Global:

- **Contributing**: See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines
- **Documentation**: Additional docs available in the [`docs/`](docs/) directory

## Credits

**Enhanced Features By:**

- **Transparent Dino**: Enhanced Spurt calculator (mee1080 formula), Virtual Pacemaker, Downhills, Rushed
- **jechtoff2dudes**: Frontrunner Overtake/Speedup mode, Dragging Skill Markers, Downhills, Skill Activation check
- **Kachi**: Bug fixes, UI improvements, mood, UI responsiveness, poskeep rewrite, RNG rework, uniques chart, spot struggle/dueling, lane movement

**Original Umalator:**

- Source code: [simulator](https://github.com/alpha123/uma-skill-tools), [UI](https://github.com/alpha123/uma-tools)

---

**Please use this tool if you KNOW what you are doing.** The simulator is powerful but requires understanding of the game mechanics to interpret results correctly.
