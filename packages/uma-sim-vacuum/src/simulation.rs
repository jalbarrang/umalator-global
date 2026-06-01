//! The `run_compare` use case + its params value object.
//!
//! Port of the vacuum/compare orchestration: races a small synthetic field
//! (typically one runner) over `nsamples` rounds, attaching the
//! [`CompareDataCollector`], and returns the accumulated paired-delta read-model.

use crate::collectors::{CompareData, CompareDataCollector};
use crate::race::{Race, SimulationSettings};
use uma_sim_primitives::course::model::CourseData;
use uma_sim_primitives::runner::lifecycle::CreateRunner;
use uma_sim_primitives::runner::mechanics::DuelingRates;
use uma_sim_primitives::shared_kernel::language::GroundCondition;
use uma_sim_primitives::shared_kernel::params::RaceParameters;

/// Errors raised validating / running a compare simulation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SimError {
    /// `nsamples` must be a positive integer.
    InvalidSamples,
    /// The field must not be empty.
    WrongRunnerCount(usize),
}

impl std::fmt::Display for SimError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SimError::InvalidSamples => write!(f, "nsamples must be a positive integer"),
            SimError::WrongRunnerCount(n) => {
                write!(f, "run_compare expects a non-empty field, got {n}")
            }
        }
    }
}

impl std::error::Error for SimError {}

/// Inputs to [`run_compare`].
///
/// The compare family races a small vacuum field (typically a single runner)
/// over `nsamples` rounds and projects the rich per-runner [`CompareData`]
/// read-model. Unlike [`run_race_sim`] there is no [`FIELD_SIZE`] requirement —
/// the orchestration runs each contestant in its own vacuum race and diffs the
/// collected telemetry on the TS side.
pub struct CompareSimParams {
    /// The course to race.
    pub course: CourseData,
    /// Ground condition.
    pub ground: GroundCondition,
    /// Race-wide parameters.
    pub parameters: RaceParameters,
    /// Simulation settings (compare mode, toggles, sample budget).
    pub settings: SimulationSettings,
    /// Per-strategy dueling rates (compare-mode artificial dueling).
    pub dueling_rates: DuelingRates,
    /// The contestants to race (typically 1; the collector handles more).
    pub runners: Vec<CreateRunner>,
    /// Number of rounds to simulate.
    pub nsamples: usize,
    /// Master seed (round `i` uses `master_seed + i`).
    pub master_seed: u64,
}

/// Run a compare simulation over `nsamples` rounds.
///
/// Constructs the [`Race`] aggregate with the given dueling rates, adds the
/// contestants, attaches the [`CompareDataCollector`], and runs `nsamples`
/// rounds with seeds `master_seed + i`. Returns the accumulated [`CompareData`]
/// projection (per-round, per-runner telemetry); the bashin-delta + summary
/// statistics are computed by the caller (TS side).
pub fn run_compare(params: CompareSimParams) -> Result<CompareData, SimError> {
    if params.nsamples == 0 {
        return Err(SimError::InvalidSamples);
    }
    if params.runners.is_empty() {
        return Err(SimError::WrongRunnerCount(0));
    }

    let mut race = Race::new(
        params.course,
        params.ground,
        params.settings,
        params.parameters,
        Some(params.dueling_rates),
    );
    for runner in params.runners {
        race.add_runner(runner);
    }

    let collector = CompareDataCollector::new();
    race.subscribe(collector.handle());

    for i in 0..params.nsamples {
        race.prepare_round(params.master_seed + i as u64);
        race.run();
    }

    Ok(collector.result())
}

#[cfg(test)]
mod tests {
    use super::*;
    use uma_sim_primitives::mob::generate_mob_field;
    use uma_sim_primitives::runner::test_support::{test_course, test_race_params};

    fn compare_params(nsamples: usize, runners: usize) -> CompareSimParams {
        CompareSimParams {
            course: test_course(),
            ground: GroundCondition::Firm,
            parameters: test_race_params(),
            settings: SimulationSettings::default(),
            dueling_rates: DuelingRates {
                runaway: 10.0,
                front_runner: 10.0,
                pace_chaser: 10.0,
                late_surger: 10.0,
                end_closer: 10.0,
            },
            runners: generate_mob_field().into_iter().take(runners).collect(),
            nsamples,
            master_seed: 4242,
        }
    }

    #[test]
    fn compare_rejects_invalid_sample_count() {
        assert!(matches!(
            run_compare(compare_params(0, 1)),
            Err(SimError::InvalidSamples)
        ));
    }

    #[test]
    fn compare_rejects_empty_field() {
        assert!(matches!(
            run_compare(compare_params(1, 0)),
            Err(SimError::WrongRunnerCount(0))
        ));
    }

    #[test]
    fn compare_runs_single_runner_vacuum() {
        let data = run_compare(compare_params(3, 1)).expect("compare runs");
        assert_eq!(data.rounds.len(), 3);
        for round in &data.rounds {
            assert_eq!(round.runners.len(), 1);
            assert_eq!(round.primary_runner_id, Some(round.runners[0].runner_id));
            assert!(round.runners[0].finished);
            assert!(!round.runners[0].position.is_empty());
        }
    }

    #[test]
    fn compare_deterministic_for_same_seed() {
        let a = run_compare(compare_params(2, 1)).expect("a");
        let b = run_compare(compare_params(2, 1)).expect("b");
        assert_eq!(a, b);
    }
}
