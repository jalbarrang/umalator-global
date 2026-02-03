/**
 * Test Script for Enhanced Analytics Structure
 * Usage: bun run test:analytics [skillId]
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';

import { DebugConfigSchema } from './runner-config.schema';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { racedefToParams } from '@/utils/races';
import { runComparisonWithAnalytics } from '@/modules/simulation/analytics/skill-compare-analytics';
import { defaultSimulationOptions } from '@/components/bassin-chart/utils';

const program = new Command();

program
  .name('test-analytics')
  .description('Test enhanced analytics structure for skill comparison')
  .argument('<skillId>', 'Skill ID to test')
  .option('-n, --samples <samples>', 'Number of samples to run', '100')
  .option('-s, --seed <seed>', 'Random seed', '0')
  .option('-c, --config <path>', 'Path to runner config JSON file')
  .option('--no-representative', 'Skip representative runs to save memory')
  .option('--bin-size <size>', 'Distance bin size in meters', '10')
  .action((skillId, options) => {
    const samples = parseInt(options.samples);
    let seed = parseInt(options.seed);
    if (seed === 0) {
      seed = Math.floor(Math.random() * 1000000);
    }

    // Load and validate config
    let config;
    try {
      const configPath = resolve(options.config);
      const configContent = readFileSync(configPath, 'utf-8');
      const rawConfig = JSON.parse(configContent);
      config = DebugConfigSchema.parse(rawConfig);
      console.log(`✅ Loaded config from: ${options.config}\n`);
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Failed to load config:', error.message);
        if ('issues' in error) {
          console.error('\nValidation errors:');
          (error as any).issues.forEach((issue: any) => {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
          });
        }
      }
      process.exit(1);
    }

    const { runner, raceConditions, courseId } = config;

    console.log(`🧪 Testing Enhanced Analytics Structure`);
    console.log(`   Skill ID: ${skillId}`);
    console.log(`   Samples: ${samples}`);
    console.log(`   Seed: ${seed}`);
    console.log(`   Course: ${courseId}`);
    console.log(`   Bin Size: ${options.binSize}m\n`);

    const course = CourseHelpers.getCourse(courseId);
    const raceParams = racedefToParams(raceConditions, runner.strategy);

    const simOptions = {
      ...defaultSimulationOptions,
      seed,
    };

    const testRunner: RunnerState = runner;
    const runnerWithSkill: RunnerState = {
      ...testRunner,
      skills: [...testRunner.skills, skillId],
    };

    console.log('Running comparison with analytics collection...\n');

    const startTime = performance.now();

    const result = runComparisonWithAnalytics(
      {
        nsamples: samples,
        course,
        racedef: raceParams,
        runnerA: testRunner,
        runnerB: runnerWithSkill,
        pacer: null,
        options: simOptions,
      },
      skillId,
      {
        includeRepresentativeRuns: options.representative,
        binSize: parseInt(options.binSize),
        trackCorrelation: true,
      },
    );

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    const analytics = result.skillAnalytics.activationAnalytics;

    console.log(`⏱️  Completed in ${duration}s\n`);

    console.log('📊 Performance Results:');
    console.log(`  Min: ${result.min.toFixed(3)}s`);
    console.log(`  Max: ${result.max.toFixed(3)}s`);
    console.log(`  Mean: ${result.mean.toFixed(3)}s`);
    console.log(`  Median: ${result.median.toFixed(3)}s\n`);

    console.log('🎯 Condition Satisfaction:');
    console.log(`  Total Activations: ${analytics.totalActivations}`);
    console.log(
      `  Conditions Met: ${analytics.samplesWithConditions}/${samples} samples (${analytics.conditionSatisfactionRate.toFixed(1)}%)`,
    );
    console.log(
      `  Conditions Not Met: ${analytics.impact.samplesWithoutConditions}/${samples} samples`,
    );
    console.log(`  Avg Activations per Race: ${analytics.stats.avgActivationsPerRace.toFixed(2)}`);
    console.log(`  Std Dev: ${analytics.stats.stdDevActivations.toFixed(2)}\n`);

    console.log('📍 WHERE Analysis (Position):');
    console.log(`  Typical Position: ${analytics.position.avgPosition.toFixed(1)}m`);
    console.log(
      `  Position Range: ${analytics.position.minPosition.toFixed(0)}m - ${analytics.position.maxPosition.toFixed(0)}m`,
    );
    console.log(`  Std Dev: ${analytics.position.stdDevPosition.toFixed(1)}m`);
    console.log(`  Consistency: ${analytics.position.consistency}`);
    console.log(
      `  Peak Zone: ${analytics.position.peakZone.start}m-${analytics.position.peakZone.end}m (${analytics.position.peakZone.percentage.toFixed(1)}%)\n`,
    );

    console.log('🏁 WHEN Analysis (Race Phase):');
    console.log(
      `  Dominant Phase: ${analytics.phase.dominantPhase} (${analytics.phase.concentration.toFixed(1)}%)`,
    );
    console.log(`  Classification: ${analytics.phase.classification}`);
    console.log(`  Breakdown:`);
    const totalPhase =
      analytics.phase.breakdown.phase0 +
      analytics.phase.breakdown.phase1 +
      analytics.phase.breakdown.phase2 +
      analytics.phase.breakdown.phase3;
    if (totalPhase > 0) {
      console.log(
        `    Phase 0 (Start):  ${analytics.phase.breakdown.phase0} (${((analytics.phase.breakdown.phase0 / totalPhase) * 100).toFixed(1)}%)`,
      );
      console.log(
        `    Phase 1 (Middle): ${analytics.phase.breakdown.phase1} (${((analytics.phase.breakdown.phase1 / totalPhase) * 100).toFixed(1)}%)`,
      );
      console.log(
        `    Phase 2 (Final):  ${analytics.phase.breakdown.phase2} (${((analytics.phase.breakdown.phase2 / totalPhase) * 100).toFixed(1)}%)`,
      );
      console.log(
        `    Phase 3 (Spurt):  ${analytics.phase.breakdown.phase3} (${((analytics.phase.breakdown.phase3 / totalPhase) * 100).toFixed(1)}%)\n`,
      );
    } else {
      console.log('    No activations recorded\n');
    }

    console.log('📈 Effect Types:');
    if (analytics.effectTypes.length > 0) {
      analytics.effectTypes.forEach((effect) => {
        console.log(
          `  Type ${effect.effectType}: ${effect.count} activations, avg duration ${effect.avgDuration.toFixed(1)}m`,
        );
      });
    } else {
      console.log('  No effects recorded');
    }
    console.log();

    console.log('🔥 Top 5 Distance Bins (by activation frequency):');
    const topBins = [...analytics.distanceBins]
      .filter((bin) => bin.activationCount > 0)
      .sort((a, b) => b.activationCount - a.activationCount)
      .slice(0, 5);

    if (topBins.length > 0) {
      topBins.forEach((bin, index) => {
        console.log(
          `  ${index + 1}. ${bin.start}m-${bin.end}m: ${bin.activationCount} (${bin.percentage.toFixed(1)}%)`,
        );
      });
    } else {
      console.log('  No activations recorded');
    }
    console.log();

    console.log('💥 Performance Impact:');
    console.log(
      `  When Conditions Met: ${analytics.impact.avgImpactWhenActive.toFixed(3)}s improvement (${analytics.impact.samplesWithConditions} samples)`,
    );
    console.log(
      `  When Conditions NOT Met: ${analytics.impact.avgImpactWhenInactive.toFixed(3)}s improvement (${analytics.impact.samplesWithoutConditions} samples)`,
    );
    console.log(`  Impact Difference: ${analytics.impact.impactDifference.toFixed(3)}s`);
    console.log(
      `  Insight: ${analytics.impact.impactDifference > 0 ? 'Conditions are crucial for performance' : 'Skill provides benefit regardless of conditions'}\n`,
    );

    console.log('💡 Sample Correlation (top 5 best, top 5 worst):');
    const sortedSamples = [...analytics.impact.sampleData].sort(
      (a, b) => b.basinnDiff - a.basinnDiff,
    );
    const top5Best = sortedSamples.slice(0, 5);
    const top5Worst = sortedSamples.slice(-5).reverse();

    console.log('  Best Performances:');
    top5Best.forEach((sample, index) => {
      const positions =
        sample.positions.length > 0
          ? sample.positions.map((p) => `${p.start.toFixed(0)}m`).join(', ')
          : 'no activation';
      console.log(
        `    ${index + 1}. Sample ${sample.sampleIndex}: ${sample.activationCount}x @ [${positions}] → ${sample.basinnDiff.toFixed(3)}s`,
      );
    });

    console.log('  Worst Performances:');
    top5Worst.forEach((sample, index) => {
      const positions =
        sample.positions.length > 0
          ? sample.positions.map((p) => `${p.start.toFixed(0)}m`).join(', ')
          : 'no activation';
      console.log(
        `    ${index + 1}. Sample ${sample.sampleIndex}: ${sample.activationCount}x @ [${positions}] → ${sample.basinnDiff.toFixed(3)}s`,
      );
    });

    console.log('\n✅ Test complete!\n');
  });

program.parse();
