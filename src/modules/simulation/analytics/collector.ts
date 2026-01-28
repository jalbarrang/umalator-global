/**
 * Activation Analytics Collector
 *
 * Collects and aggregates activation data across all simulation samples
 * for comprehensive statistical analysis.
 */

import { CourseHelpers } from '../lib/course/CourseData';
import type {
  ActivationAnalytics,
  ActivationRecord,
  DistanceBin,
  DominantPhase,
  EffectTypeStats,
  PhaseBreakdown,
  PhaseClassification,
  PositionConsistency,
  SampleActivationData,
} from './types';
import type { ISkillType } from '../lib/skills/definitions';

export class ActivationCollector {
  private courseDistance: number;
  private binSize: number;

  // Per-sample tracking
  private sampleActivations: Array<SampleActivationData> = [];

  // Aggregated counters
  private distanceBinCounts: Array<number> = [];
  private phaseCounts: PhaseBreakdown = {
    phase0: 0,
    phase1: 0,
    phase2: 0,
    phase3: 0,
  };
  private effectTypeMap: Map<ISkillType, { count: number; totalDuration: number }> = new Map();

  constructor(courseDistance: number, binSize: number = 10) {
    this.courseDistance = courseDistance;
    this.binSize = binSize;

    // Initialize distance bins
    const numBins = Math.ceil(courseDistance / binSize);
    this.distanceBinCounts = new Array(numBins).fill(0);
  }

  /**
   * Record activations for a single sample
   */
  recordSample(
    sampleIndex: number,
    activations: Array<ActivationRecord>,
    basinnDiff: number,
  ): void {
    const sampleData: SampleActivationData = {
      sampleIndex,
      activationCount: activations.length,
      basinnDiff,
      positions: [],
    };

    activations.forEach((activation) => {
      const { start, end, effectType } = activation;

      // Record position for sample data
      sampleData.positions.push({ start, end, effectType });

      // Update distance bins
      const binIndex = Math.floor(start / this.binSize);
      if (binIndex >= 0 && binIndex < this.distanceBinCounts.length) {
        this.distanceBinCounts[binIndex]++;
      }

      // Update phase counts
      const phase = this.getPhase(start);
      switch (phase) {
        case 0:
          this.phaseCounts.phase0++;
          break;
        case 1:
          this.phaseCounts.phase1++;
          break;
        case 2:
          this.phaseCounts.phase2++;
          break;
        case 3:
          this.phaseCounts.phase3++;
          break;
      }

      // Update effect type stats
      const duration = end - start;
      const existing = this.effectTypeMap.get(effectType);
      if (existing) {
        existing.count++;
        existing.totalDuration += duration;
      } else {
        this.effectTypeMap.set(effectType, { count: 1, totalDuration: duration });
      }
    });

    this.sampleActivations.push(sampleData);
  }

  /**
   * Generate final analytics report
   */
  generateAnalytics(): ActivationAnalytics {
    const totalActivations = this.sampleActivations.reduce(
      (sum, sample) => sum + sample.activationCount,
      0,
    );

    const samplesWithConditions = this.sampleActivations.filter(
      (sample) => sample.activationCount > 0,
    ).length;

    const samplesWithoutConditions = this.sampleActivations.filter(
      (sample) => sample.activationCount === 0,
    ).length;

    const totalSamples = this.sampleActivations.length;
    const conditionSatisfactionRate =
      totalSamples > 0 ? (samplesWithConditions / totalSamples) * 100 : 0;

    // Generate distance bins with percentages
    const distanceBins: Array<DistanceBin> = this.distanceBinCounts.map((count, index) => ({
      start: index * this.binSize,
      end: (index + 1) * this.binSize,
      activationCount: count,
      percentage: totalActivations > 0 ? (count / totalActivations) * 100 : 0,
    }));

    // Convert effect type map to array
    const effectTypes: Array<EffectTypeStats> = Array.from(this.effectTypeMap.entries()).map(
      ([effectType, stats]) => ({
        effectType,
        count: stats.count,
        totalDuration: stats.totalDuration,
        avgDuration: stats.count > 0 ? stats.totalDuration / stats.count : 0,
      }),
    );

    // Calculate statistics
    const activationCounts = this.sampleActivations.map((s) => s.activationCount);
    const avgActivationsPerRace = totalSamples > 0 ? totalActivations / totalSamples : 0;
    const stdDevActivations = this.calculateStdDev(activationCounts);

    // Calculate position statistics (only for samples with activations)
    const allPositions = this.sampleActivations.flatMap((s) => s.positions.map((p) => p.start));
    const avgPosition =
      allPositions.length > 0
        ? allPositions.reduce((sum, pos) => sum + pos, 0) / allPositions.length
        : 0;
    const stdDevPosition = this.calculateStdDev(allPositions);
    const minPosition = allPositions.length > 0 ? Math.min(...allPositions) : 0;
    const maxPosition = allPositions.length > 0 ? Math.max(...allPositions) : 0;

    // Position consistency classification
    const consistency = this.classifyConsistency(stdDevPosition);

    // Find peak zone
    const peakBin = distanceBins.reduce((max, bin) =>
      bin.activationCount > max.activationCount ? bin : max,
    );

    // Phase analytics
    const totalPhaseActivations =
      this.phaseCounts.phase0 +
      this.phaseCounts.phase1 +
      this.phaseCounts.phase2 +
      this.phaseCounts.phase3;

    const phasePercentages = {
      phase0:
        totalPhaseActivations > 0 ? (this.phaseCounts.phase0 / totalPhaseActivations) * 100 : 0,
      phase1:
        totalPhaseActivations > 0 ? (this.phaseCounts.phase1 / totalPhaseActivations) * 100 : 0,
      phase2:
        totalPhaseActivations > 0 ? (this.phaseCounts.phase2 / totalPhaseActivations) * 100 : 0,
      phase3:
        totalPhaseActivations > 0 ? (this.phaseCounts.phase3 / totalPhaseActivations) * 100 : 0,
    };

    const dominantPhase = this.getDominantPhase(phasePercentages);
    const concentration = Math.max(
      phasePercentages.phase0,
      phasePercentages.phase1,
      phasePercentages.phase2,
      phasePercentages.phase3,
    );

    const classification = this.classifyPhasePattern(phasePercentages);

    // Impact analytics
    const samplesWithActive = this.sampleActivations.filter((s) => s.activationCount > 0);
    const samplesWithoutActive = this.sampleActivations.filter((s) => s.activationCount === 0);

    const avgImpactWhenActive =
      samplesWithActive.length > 0
        ? samplesWithActive.reduce((sum, s) => sum + s.basinnDiff, 0) / samplesWithActive.length
        : 0;

    const avgImpactWhenInactive =
      samplesWithoutActive.length > 0
        ? samplesWithoutActive.reduce((sum, s) => sum + s.basinnDiff, 0) /
          samplesWithoutActive.length
        : 0;

    return {
      totalActivations,
      samplesWithConditions,
      conditionSatisfactionRate,
      position: {
        avgPosition,
        stdDevPosition,
        minPosition,
        maxPosition,
        consistency,
        peakZone: {
          start: peakBin.start,
          end: peakBin.end,
          percentage: peakBin.percentage,
        },
      },
      phase: {
        breakdown: this.phaseCounts,
        dominantPhase,
        concentration,
        classification,
      },
      distanceBins,
      effectTypes,
      impact: {
        sampleData: this.sampleActivations,
        avgImpactWhenActive,
        avgImpactWhenInactive,
        impactDifference: avgImpactWhenActive - avgImpactWhenInactive,
        samplesWithConditions,
        samplesWithoutConditions,
      },
      stats: {
        avgActivationsPerRace,
        stdDevActivations,
      },
    };
  }

  /**
   * Get race phase for a given position
   */
  private getPhase(position: number): number {
    const phase1Start = CourseHelpers.phaseStart(this.courseDistance, 1);
    const phase2Start = CourseHelpers.phaseStart(this.courseDistance, 2);
    const phase3Start = CourseHelpers.phaseStart(this.courseDistance, 3);

    if (position < phase1Start) return 0;
    if (position < phase2Start) return 1;
    if (position < phase3Start) return 2;
    return 3;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: Array<number>): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Classify position consistency based on standard deviation
   */
  private classifyConsistency(stdDev: number): PositionConsistency {
    if (stdDev < 30) return 'very-high';
    if (stdDev < 60) return 'high';
    if (stdDev < 100) return 'medium';
    if (stdDev < 150) return 'low';
    return 'very-low';
  }

  /**
   * Determine dominant phase from percentages
   */
  private getDominantPhase(percentages: {
    phase0: number;
    phase1: number;
    phase2: number;
    phase3: number;
  }): DominantPhase {
    const phases = [
      { name: 'early-race' as const, pct: percentages.phase0 },
      { name: 'mid-race' as const, pct: percentages.phase1 },
      { name: 'late-race' as const, pct: percentages.phase2 },
      { name: 'last-spurt' as const, pct: percentages.phase3 },
    ];

    return phases.reduce((max, phase) => (phase.pct > max.pct ? phase : max)).name;
  }

  /**
   * Classify phase activation pattern
   */
  private classifyPhasePattern(percentages: {
    phase0: number;
    phase1: number;
    phase2: number;
    phase3: number;
  }): PhaseClassification {
    const max = Math.max(
      percentages.phase0,
      percentages.phase1,
      percentages.phase2,
      percentages.phase3,
    );

    // If one phase has >70%, it's focused
    if (max > 70) {
      if (percentages.phase0 === max) return 'early-race';
      if (percentages.phase1 === max) return 'mid-race';
      if (percentages.phase2 === max) return 'late-race';
      if (percentages.phase3 === max) return 'spurt-focused';
    }

    // If last two phases combined >70%, it's late-race
    if (percentages.phase2 + percentages.phase3 > 70) {
      return 'late-race';
    }

    return 'distributed';
  }
}
