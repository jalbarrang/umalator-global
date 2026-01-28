/**
 * Enhanced Analytics Types for Skill Bassin Analysis
 *
 * This structure captures activation data across ALL samples for WHEN/WHERE analysis.
 *
 * Note: With skillCheckChance disabled, skills always activate when conditions are met.
 * Therefore, these metrics measure CONDITION SATISFACTION (when/where) not activation reliability.
 */

import type { ISkillType } from '../lib/skills/definitions';

export type DominantPhase = 'early-race' | 'mid-race' | 'late-race' | 'last-spurt';
export type PositionConsistency = 'very-high' | 'high' | 'medium' | 'low' | 'very-low';
export type PhaseClassification =
  | 'early-race'
  | 'mid-race'
  | 'late-race'
  | 'spurt-focused'
  | 'distributed';

/**
 * Distance bin for position distribution analysis
 */
export interface DistanceBin {
  start: number;
  end: number;
  activationCount: number;
  percentage: number;
}

/**
 * Effect type statistics
 */
export interface EffectTypeStats {
  effectType: ISkillType;
  count: number;
  avgDuration: number;
  totalDuration: number;
}

/**
 * Per-sample activation data with performance correlation
 */
export interface SampleActivationData {
  sampleIndex: number;
  activationCount: number;
  basinnDiff: number;
  positions: Array<{
    start: number;
    end: number;
    effectType: ISkillType;
  }>;
}

/**
 * Phase-based activation breakdown
 */
export interface PhaseBreakdown {
  phase0: number; // Start phase (0 - 1/6)
  phase1: number; // Middle phase (1/6 - 2/3)
  phase2: number; // Final phase (2/3 - last spurt)
  phase3: number; // Last spurt
}

/**
 * Position distribution and timing analytics
 */
export interface PositionAnalytics {
  // WHERE: Position-based metrics
  avgPosition: number;
  stdDevPosition: number;
  minPosition: number;
  maxPosition: number;

  // Position consistency classification
  consistency: PositionConsistency;

  // Peak activation zone
  peakZone: {
    start: number;
    end: number;
    percentage: number;
  };
}

/**
 * Race phase timing analytics
 */
export interface PhaseAnalytics {
  breakdown: PhaseBreakdown;

  // Dominant phase where most activations occur
  dominantPhase: DominantPhase;

  // % of activations in dominant phase
  concentration: number;

  // Phase classification
  classification: PhaseClassification;
}

/**
 * Performance impact analytics
 */
export interface ImpactAnalytics {
  // Per-sample correlation data
  sampleData: Array<SampleActivationData>;

  // Performance when conditions met vs not met
  avgImpactWhenActive: number;
  avgImpactWhenInactive: number;
  impactDifference: number;

  // Samples by condition status
  samplesWithConditions: number;
  samplesWithoutConditions: number;
}

/**
 * Aggregated activation analytics across all samples
 *
 * Focus: WHEN and WHERE do skill conditions get satisfied during races
 */
export interface ActivationAnalytics {
  // Total activations across all samples
  totalActivations: number;

  // Samples where conditions were met
  samplesWithConditions: number;

  // Condition satisfaction rate (% of samples where conditions met)
  // Note: This measures how often race conditions favor this skill, not activation reliability
  conditionSatisfactionRate: number;

  // WHERE: Position distribution analysis
  position: PositionAnalytics;

  // WHEN: Race phase timing analysis
  phase: PhaseAnalytics;

  // Distance-based frequency distribution (for heatmaps)
  distanceBins: Array<DistanceBin>;

  // Effect types activated (for multi-effect skills)
  effectTypes: Array<EffectTypeStats>;

  // IMPACT: Performance correlation
  impact: ImpactAnalytics;

  // Legacy fields for compatibility
  stats: {
    avgActivationsPerRace: number;
    stdDevActivations: number;
  };
}

/**
 * Position distribution and timing analytics
 */
export interface PositionAnalytics {
  // WHERE: Position-based metrics
  avgPosition: number;
  stdDevPosition: number;
  minPosition: number;
  maxPosition: number;

  // Position consistency classification
  consistency: PositionConsistency;

  // Peak activation zone
  peakZone: {
    start: number;
    end: number;
    percentage: number;
  };
}

/**
 * Race phase timing analytics
 */
export interface PhaseAnalytics {
  breakdown: PhaseBreakdown;

  // Dominant phase where most activations occur
  dominantPhase: DominantPhase;

  // % of activations in dominant phase
  concentration: number;

  // Phase classification
  classification: PhaseClassification;
}

/**
 * Performance impact analytics
 */
export interface ImpactAnalytics {
  // Per-sample correlation data
  sampleData: Array<SampleActivationData>;

  // Performance when conditions met vs not met
  avgImpactWhenActive: number;
  avgImpactWhenInactive: number;
  impactDifference: number;

  // Samples by condition status
  samplesWithConditions: number;
  samplesWithoutConditions: number;
}

/**
 * Simplified activation record for representative runs
 */
export interface ActivationRecord {
  start: number;
  end: number;
  effectType: ISkillType;
}

/**
 * Representative run activation summary (grouped by skillId)
 */
export interface RepresentativeRunSummary {
  [skillId: string]: Array<ActivationRecord>;
}

/**
 * Complete analytics result for a single skill
 */
export interface SkillAnalyticsResult {
  skillId: string;

  // Performance metrics (existing)
  results: Array<number>;
  min: number;
  max: number;
  mean: number;
  median: number;

  // NEW: Comprehensive activation analytics
  activationAnalytics: ActivationAnalytics;

  // Representative runs for detailed inspection (optional, can be omitted to save memory)
  representativeRuns?: {
    minrun: RepresentativeRunSummary;
    maxrun: RepresentativeRunSummary;
    meanrun: RepresentativeRunSummary;
    medianrun: RepresentativeRunSummary;
  };
}

/**
 * Response type for batch skill comparison
 */
export type SkillAnalyticsResponse = Record<string, SkillAnalyticsResult>;

/**
 * Options for analytics collection
 */
export interface AnalyticsOptions {
  // Whether to include representative runs (saves memory if false)
  includeRepresentativeRuns: boolean;

  // Distance bin size in meters (default: 10)
  binSize: number;

  // Whether to track per-sample correlation data
  trackCorrelation: boolean;
}
