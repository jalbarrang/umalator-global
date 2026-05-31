//! Criterion benchmarks for the race-simulation use case.
//!
//! Two workloads: a single 9-runner round, and 100 rounds (the typical Monte
//! Carlo sample budget). Record the baseline here when tuning; results are not
//! comparable to the TS engine (different PRNG) but track Rust-side regressions.

use criterion::{criterion_group, criterion_main, Criterion};
use std::hint::black_box;

use uma_sim_core::application::mob::generate_mob_field;
use uma_sim_core::application::simulation::{run_race_sim, RaceSimParams};
use uma_sim_core::course::model::CourseData;
use uma_sim_core::racing::race::SimulationSettings;
use uma_sim_core::shared_kernel::language::{
    DistanceType, Grade, GroundCondition, Orientation, Season, Surface, TimeOfDay, Weather,
};
use uma_sim_core::shared_kernel::params::{RaceParameters, SimulationMode};

/// A minimal 2400m turf course (no corners/straights/slopes) for benchmarking
/// the hot loop without depending on real course data.
fn bench_course() -> CourseData {
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

fn bench_params() -> RaceParameters {
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

fn make_params(nsamples: usize) -> RaceSimParams {
    RaceSimParams {
        course: bench_course(),
        ground: GroundCondition::Firm,
        parameters: bench_params(),
        settings: SimulationSettings::default(),
        runners: generate_mob_field(),
        nsamples,
        master_seed: 9001,
        focus_runner_ids: vec![],
    }
}

fn bench_single_round(c: &mut Criterion) {
    c.bench_function("race_sim/single_round", |b| {
        b.iter(|| {
            let result = run_race_sim(black_box(make_params(1)));
            black_box(result.expect("sim runs"));
        });
    });
}

fn bench_hundred_rounds(c: &mut Criterion) {
    c.bench_function("race_sim/hundred_rounds", |b| {
        b.iter(|| {
            let result = run_race_sim(black_box(make_params(100)));
            black_box(result.expect("sim runs"));
        });
    });
}

criterion_group!(benches, bench_single_round, bench_hundred_rounds);
criterion_main!(benches);
