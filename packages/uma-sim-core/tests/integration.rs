//! Black-box integration tests for the `run_race_sim` use case.
//!
//! These exercise the whole public stack (course → skills/stamina → racing
//! aggregate → application) through the crate's public API only. Results differ
//! from the TS engine by design (fresh xoshiro256** PRNG); we assert structural
//! invariants and determinism, not parity.

use uma_sim_core::application::mob::generate_mob_field;
use uma_sim_core::application::simulation::{run_race_sim, RaceSimParams, SimError, FIELD_SIZE};
use uma_sim_core::course::model::CourseData;
use uma_sim_core::racing::race::SimulationSettings;
use uma_sim_core::shared_kernel::language::{
    DistanceType, Grade, GroundCondition, Orientation, Season, Surface, TimeOfDay, Weather,
};
use uma_sim_core::shared_kernel::params::{RaceParameters, SimulationMode};

fn course() -> CourseData {
    CourseData {
        course_id: 1,
        race_track_id: 10001,
        distance: 2400.0,
        distance_type: DistanceType::Long,
        surface: Surface::Turf,
        turn: Orientation::Clockwise,
        course_set_status: vec![],
        corners: vec![],
        straights: vec![],
        slopes: vec![],
        lane_max: 10.0,
        course_width: 30.0,
        horse_lane: 1.5,
        lane_change_acceleration: 0.0,
        lane_change_acceleration_per_frame: 0.0,
        max_lane_distance: 0.0,
        move_lane_point: 0.0,
    }
}

fn params() -> RaceParameters {
    RaceParameters {
        ground: GroundCondition::Firm,
        weather: Weather::Sunny,
        season: Season::Spring,
        time_of_day: TimeOfDay::Midday,
        grade: Grade::G1,
        num_umas: Some(9),
        order_range: None,
        skill_id: None,
        strategy_counts: None,
        common_skills: None,
        mode: SimulationMode::Normal,
    }
}

fn sim_params(nsamples: usize, settings: SimulationSettings) -> RaceSimParams {
    RaceSimParams {
        course: course(),
        ground: GroundCondition::Firm,
        parameters: params(),
        settings,
        runners: generate_mob_field(),
        nsamples,
        master_seed: 4242,
        focus_runner_ids: vec![],
    }
}

#[test]
fn full_stack_is_deterministic_for_same_seed() {
    let a = run_race_sim(sim_params(3, SimulationSettings::default())).expect("run a");
    let b = run_race_sim(sim_params(3, SimulationSettings::default())).expect("run b");
    assert_eq!(a.finish_orders, b.finish_orders);
}

#[test]
fn every_round_finishes_the_full_field() {
    let result = run_race_sim(sim_params(5, SimulationSettings::default())).expect("run");
    assert_eq!(result.finish_orders.len(), 5);
    for round in &result.finish_orders {
        assert_eq!(round.len(), FIELD_SIZE);
        // Winner crossed the line first with a positive finish time.
        assert!(round[0].finish_time > 0.0);
        // Finish times are non-decreasing down the order.
        for pair in round.windows(2) {
            assert!(pair[1].finish_time >= pair[0].finish_time - 1e-9);
        }
    }
}

#[test]
fn runs_with_health_system_disabled() {
    let settings = SimulationSettings {
        health_system: false,
        ..SimulationSettings::default()
    };
    let result = run_race_sim(sim_params(2, settings)).expect("run");
    for round in &result.finish_orders {
        assert_eq!(round.len(), FIELD_SIZE);
    }
}

#[test]
fn rejects_wrong_runner_count() {
    let mut p = sim_params(1, SimulationSettings::default());
    p.runners.truncate(2);
    assert_eq!(run_race_sim(p), Err(SimError::WrongRunnerCount(2)));
}

#[test]
fn rejects_zero_samples() {
    let p = sim_params(0, SimulationSettings::default());
    assert_eq!(run_race_sim(p), Err(SimError::InvalidSamples));
}
