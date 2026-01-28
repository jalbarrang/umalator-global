/**
 * Batch Analytics Test - Table Output
 *
 * Mimics the pool worker batch processing to test multiple skills
 * and display results in table format matching the UI.
 *
 * Usage: bun run test:batch-analytics --skills <path> -c <config>
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';

import { DebugConfigSchema } from './runner-config.schema';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import type { SkillAnalyticsResult } from '@/modules/simulation/analytics';
import { CourseHelpers } from '@/modules/simulation/lib/course/CourseData';
import { racedefToParams } from '@/utils/races';
import { runComparisonWithAnalytics } from '@/modules/simulation/analytics';
import { defaultSimulationOptions, getActivateableSkills } from '@/components/bassin-chart/utils';
import { getBaseSkillsToTest, getSkillNameById } from '@/modules/skills/utils';

const baseSkillsToTest = getBaseSkillsToTest();

const program = new Command();

program
  .name('test-batch-analytics')
  .description('Test batch processing with enhanced analytics')
  .argument('<config>', 'Path to runner config JSON file')
  .option('-n, --samples <samples>', 'Number of samples to run', '200')
  .option('-s, --seed <seed>', 'Random seed', '0')
  .action((config, options) => {
    // Load skills from JSON file
    const samples = parseInt(options.samples);
    let seed = parseInt(options.seed);
    if (seed === 0) {
      seed = Math.floor(Math.random() * 1000000);
    }

    // Load config
    let configData;
    try {
      const configPath = resolve(config);
      const configContent = readFileSync(configPath, 'utf-8');
      const rawConfig = JSON.parse(configContent);
      configData = DebugConfigSchema.parse(rawConfig);
      console.log(`✅ Loaded config from: ${config}\n`);
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Failed to load config:', error.message);
      }
      process.exit(1);
    }

    // Get config values
    const { runner, raceConditions, courseId } = configData;

    // Race parameters and simulation options
    const course = CourseHelpers.getCourse(courseId);
    const raceParams = racedefToParams(raceConditions, runner.strategy);
    const simOptions = {
      ...defaultSimulationOptions,
      seed,
    };

    const skillsToTest = baseSkillsToTest.filter(
      (skillId) =>
        !runner.skills.includes(skillId) &&
        (!skillId.startsWith('9') || !runner.skills.includes('1' + skillId.slice(1))),
    );

    const skills = getActivateableSkills(skillsToTest, runner, course, raceParams);

    console.log(`🧪 Batch Analytics Test`);
    console.log(`   Base runner skills: ${runner.skills.join(', ')}`);
    console.log(`   Testing: ${skillsToTest.length} new skills`);
    console.log(`   Samples per skill: ${samples}`);
    console.log(`   Total simulations: ${skillsToTest.length * samples}`);
    console.log(`   Seed: ${seed}\n`);

    const testRunner: RunnerState = runner;
    const skillIds = skills;

    console.log('Running batch comparison with enhanced analytics...\n');

    // Measure memory before
    if (global.gc) global.gc();
    const memBefore = process.memoryUsage();

    const startTime = performance.now();

    const newResults: Record<string, SkillAnalyticsResult> = {};

    skillIds.forEach((skillId) => {
      const runnerWithSkill: RunnerState = {
        ...testRunner,
        skills: [...testRunner.skills, skillId],
      };

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
          includeRepresentativeRuns: false,
          binSize: 10,
          trackCorrelation: true,
        },
      );

      newResults[skillId] = result.skillAnalytics;
    });

    const endTime = performance.now();

    // Measure memory after
    const memAfter = process.memoryUsage();

    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const memUsed = ((memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024).toFixed(2);

    console.log(`⏱️  Completed in ${duration}s`);
    console.log(`💾 Memory used: ${memUsed}MB\n`);

    // Table output (always shown)
    console.log('📊 Bassin Results Table:');
    console.log('─'.repeat(120));
    console.log(
      '  Skill name'.padEnd(35) +
        'Minimum'.padEnd(15) +
        'Maximum'.padEnd(15) +
        'Mean'.padEnd(15) +
        'Median'.padEnd(15) +
        'Phase',
    );
    console.log('─'.repeat(120));

    // Sort by mean (descending)
    const sortedSkills = skillIds
      .map((skillId) => ({
        skillId,
        result: newResults[skillId],
      }))
      .filter((item) => item.result)
      .sort((a, b) => b.result.mean - a.result.mean);

    sortedSkills.forEach(({ skillId, result }) => {
      const analytics = result.activationAnalytics;
      try {
        const skillName = getSkillNameById(skillId);
        const phaseInfo = `${analytics.phase.dominantPhase} (${analytics.conditionSatisfactionRate.toFixed(0)}%)`;

        console.log(
          `  ${skillName.substring(0, 32).padEnd(35)}` +
            `${result.min.toFixed(2)} L`.padEnd(15) +
            `${result.max.toFixed(2)} L`.padEnd(15) +
            `${result.mean.toFixed(2)} L`.padEnd(15) +
            `${result.median.toFixed(2)} L`.padEnd(15) +
            `${phaseInfo}`,
        );
      } catch {
        const phaseInfo = `${analytics.phase.dominantPhase} (${analytics.conditionSatisfactionRate.toFixed(0)}%)`;
        console.log(
          `  ${skillId.padEnd(35)}` +
            `${result.min.toFixed(2)} L`.padEnd(15) +
            `${result.max.toFixed(2)} L`.padEnd(15) +
            `${result.mean.toFixed(2)} L`.padEnd(15) +
            `${result.median.toFixed(2)} L`.padEnd(15) +
            `${phaseInfo}`,
        );
      }
    });
    console.log('─'.repeat(120));
    console.log(`\n💡 Skills sorted by Mean (descending)\n`);

    // Calculate total data size
    const totalAnalyticsSize = Object.values(newResults).reduce((sum, result) => {
      const analytics = result.activationAnalytics;
      const sampleDataSize = analytics.impact.sampleData.length * 50;
      const binSize = analytics.distanceBins.length * 20;
      const metadataSize = 500;
      return sum + sampleDataSize + binSize + metadataSize;
    }, 0);

    console.log('📈 Analytics Summary:');
    console.log(
      `   Data size: ${(totalAnalyticsSize / 1024).toFixed(1)}KB total (~${(totalAnalyticsSize / 1024 / skillIds.length).toFixed(1)}KB per skill)`,
    );
    console.log(
      `   Coverage: 100% of samples (${samples} samples per skill with full WHEN/WHERE data)`,
    );

    // Count skills by condition satisfaction
    const alwaysActivate = sortedSkills.filter(
      (s) => s.result.activationAnalytics.conditionSatisfactionRate >= 90,
    ).length;
    const sometimes = sortedSkills.filter(
      (s) =>
        s.result.activationAnalytics.conditionSatisfactionRate > 0 &&
        s.result.activationAnalytics.conditionSatisfactionRate < 90,
    ).length;
    const never = sortedSkills.filter(
      (s) => s.result.activationAnalytics.conditionSatisfactionRate === 0,
    ).length;

    console.log(
      `   Skills: ${alwaysActivate} reliable, ${sometimes} situational, ${never} incompatible\n`,
    );

    console.log('✅ Analysis complete!\n');
  });

program.parse();
