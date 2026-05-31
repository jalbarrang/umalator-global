//! The `run_race_sim` use case + its params / result value objects.
//!
//! Port of `race-sim/run-race-sim.ts`. Orchestrates the [`Race`] aggregate over
//! `nsamples` rounds, attaching the read-model [`RaceSimDataCollector`] as an
//! observer, and returns the per-round finish orders plus collected telemetry.

use crate::application::collectors::{
    CollectedData, CompareData, CompareDataCollector, RaceEventLog, RaceEventLogCollector,
    RaceSimDataCollector,
};
use crate::course::model::CourseData;
use crate::racing::race::{Race, SimulationSettings};
use crate::racing::runner::lifecycle::CreateRunner;
use crate::racing::runner::mechanics::DuelingRates;
use crate::shared_kernel::ids::RunnerId;
use crate::shared_kernel::language::{GroundCondition, Strategy};
use crate::shared_kernel::params::RaceParameters;

/// The number of runners a standard race expects.
pub const FIELD_SIZE: usize = 9;

/// Inputs to [`run_race_sim`].
pub struct RaceSimParams {
    /// The course to race.
    pub course: CourseData,
    /// Ground condition.
    pub ground: GroundCondition,
    /// Race-wide parameters.
    pub parameters: RaceParameters,
    /// Simulation settings (mode, toggles, sample budget).
    pub settings: SimulationSettings,
    /// The 9 runners to race.
    pub runners: Vec<CreateRunner>,
    /// Number of rounds to simulate.
    pub nsamples: usize,
    /// Master seed (round `i` uses `master_seed + i`).
    pub master_seed: u64,
    /// Runner ids whose per-tick telemetry is captured.
    pub focus_runner_ids: Vec<RunnerId>,
}

/// One runner's finishing record for a round.
#[derive(Debug, Clone, PartialEq)]
pub struct FinishEntry {
    /// The finishing runner.
    pub runner_id: RunnerId,
    /// Display name.
    pub name: String,
    /// Running style.
    pub strategy: Strategy,
    /// Final longitudinal position in meters.
    pub finish_position: f64,
    /// Finish time in seconds.
    pub finish_time: f64,
}

/// The result of a simulation run.
#[derive(Debug, Clone, PartialEq)]
pub struct RaceSimResult {
    /// Finish order per round (index 0 = winner).
    pub finish_orders: Vec<Vec<FinishEntry>>,
    /// Collected focus-runner telemetry.
    pub collected: CollectedData,
    /// Per-round logged race events (state-transition projection).
    pub event_logs: RaceEventLog,
}

/// Errors raised validating / running a simulation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SimError {
    /// `nsamples` must be a positive integer.
    InvalidSamples,
    /// The field must contain exactly [`FIELD_SIZE`] runners.
    WrongRunnerCount(usize),
}

impl std::fmt::Display for SimError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SimError::InvalidSamples => write!(f, "nsamples must be a positive integer"),
            SimError::WrongRunnerCount(n) => {
                write!(
                    f,
                    "run_race_sim expects exactly {FIELD_SIZE} runners, got {n}"
                )
            }
        }
    }
}

impl std::error::Error for SimError {}

/// Run a race simulation over `nsamples` rounds.
///
/// Constructs the [`Race`] aggregate, adds the runners, attaches the telemetry
/// collector, and runs `nsamples` rounds with seeds `master_seed + i`. Returns
/// the per-round finish orders + collected data.
pub fn run_race_sim(params: RaceSimParams) -> Result<RaceSimResult, SimError> {
    if params.nsamples == 0 {
        return Err(SimError::InvalidSamples);
    }
    if params.runners.len() != FIELD_SIZE {
        return Err(SimError::WrongRunnerCount(params.runners.len()));
    }

    let mut race = Race::new(
        params.course,
        params.ground,
        params.settings,
        params.parameters,
        None,
    );
    for runner in params.runners {
        race.add_runner(runner);
    }

    let collector = RaceSimDataCollector::new(params.focus_runner_ids);
    race.subscribe(collector.handle());
    let event_log = RaceEventLogCollector::new();
    race.subscribe(event_log.handle());

    let mut finish_orders: Vec<Vec<FinishEntry>> = Vec::with_capacity(params.nsamples);
    for i in 0..params.nsamples {
        race.prepare_round(params.master_seed + i as u64);
        race.run();
        finish_orders.push(collect_finish_order(&race));
    }

    Ok(RaceSimResult {
        finish_orders,
        collected: collector.result(),
        event_logs: event_log.result(),
    })
}

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

/// Build the finish order for the just-completed round.
fn collect_finish_order(race: &Race) -> Vec<FinishEntry> {
    race.finished_runners()
        .iter()
        .filter_map(|&id| {
            race.runners()
                .iter()
                .find(|r| r.id == id)
                .map(|runner| FinishEntry {
                    runner_id: id,
                    name: runner.name.clone(),
                    strategy: runner.strategy,
                    finish_position: runner.position,
                    finish_time: runner.finish_time,
                })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::mob::generate_mob_field;
    use crate::racing::runner::test_support::{test_course, test_race_params};

    fn params(nsamples: usize) -> RaceSimParams {
        RaceSimParams {
            course: test_course(),
            ground: GroundCondition::Firm,
            parameters: test_race_params(),
            settings: SimulationSettings::default(),
            runners: generate_mob_field(),
            nsamples,
            master_seed: 9001,
            focus_runner_ids: vec![RunnerId(0)],
        }
    }

    #[test]
    fn rejects_invalid_sample_count() {
        assert!(matches!(
            run_race_sim(params(0)),
            Err(SimError::InvalidSamples)
        ));
    }

    #[test]
    fn rejects_wrong_runner_count() {
        let mut p = params(1);
        p.runners.pop();
        assert!(matches!(
            run_race_sim(p),
            Err(SimError::WrongRunnerCount(8))
        ));
    }

    #[test]
    fn runs_and_collects_shape() {
        let result = run_race_sim(params(3)).expect("sim runs");
        assert_eq!(result.finish_orders.len(), 3);
        for order in &result.finish_orders {
            assert_eq!(order.len(), FIELD_SIZE);
            assert!(order[0].finish_time > 0.0);
        }
        // Focus runner 0 traced over each round.
        assert_eq!(result.collected.rounds.len(), 3);
        assert_eq!(result.collected.rounds[0].focus.len(), 1);
        assert!(!result.collected.rounds[0].focus[0].samples.is_empty());
    }

    fn compare_params(nsamples: usize, runners: usize) -> CompareSimParams {
        let settings = SimulationSettings {
            mode: crate::shared_kernel::params::SimulationMode::Compare,
            ..SimulationSettings::default()
        };
        CompareSimParams {
            course: test_course(),
            ground: GroundCondition::Firm,
            parameters: test_race_params(),
            settings,
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

    #[test]
    fn deterministic_for_same_seed() {
        let a = run_race_sim(params(2)).expect("a");
        let b = run_race_sim(params(2)).expect("b");
        let order_a: Vec<RunnerId> = a.finish_orders[0].iter().map(|e| e.runner_id).collect();
        let order_b: Vec<RunnerId> = b.finish_orders[0].iter().map(|e| e.runner_id).collect();
        assert_eq!(order_a, order_b);
    }
}
