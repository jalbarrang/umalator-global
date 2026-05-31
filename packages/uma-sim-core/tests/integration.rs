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

// ---------------------------------------------------------------------------
// Bug #1 regression — compare collector must capture skill-activation effect
// logs for an activating duration skill.
// ---------------------------------------------------------------------------

use std::collections::HashMap;
use uma_sim_core::application::simulation::{run_compare, CompareSimParams};
use uma_sim_core::racing::runner::lifecycle::CreateRunner;
use uma_sim_core::racing::runner::lifecycle::RunnerAptitudes;
use uma_sim_core::racing::runner::mechanics::DuelingRates;
use uma_sim_core::shared_kernel::ids::SkillId;
use uma_sim_core::shared_kernel::language::{Aptitude, Mood, Strategy};
use uma_sim_core::shared_kernel::params::StatLine;
use uma_sim_core::skills::effect::{SkillRarity, SkillTarget};
use uma_sim_core::skills::model::{RawSkillEffect, Skill, SkillAlternative};

fn compare_settings() -> SimulationSettings {
    // Mirror the in-app compare settings (createCompareSettings): every
    // field-contention toggle off, no position-keep, no wit checks.
    SimulationSettings {
        mode: SimulationMode::Compare,
        health_system: true,
        section_modifier: false,
        rushed: false,
        downhill: false,
        spot_struggle: false,
        dueling: false,
        wit_checks: false,
        position_keep_mode: 0,
        skill_samples: 1,
        stamina_drain_overrides: HashMap::new(),
    }
}

fn dueling_rates() -> DuelingRates {
    DuelingRates {
        runaway: 0.0,
        front_runner: 0.0,
        pace_chaser: 0.0,
        late_surger: 0.0,
        end_closer: 0.0,
    }
}

fn target_speed_skill(id: &str) -> Skill {
    Skill {
        skill_id: SkillId::new(id.to_owned()),
        rarity: SkillRarity::Gold,
        alternatives: vec![SkillAlternative {
            // 24s base duration (raw ×10000), scaled by course/1000 at runtime.
            base_duration: 24000.0,
            cooldown_time: Some(300000.0),
            // Late-race target-speed: a front-runner vacuum always satisfies it.
            condition: "phase>=1".to_owned(),
            precondition: None,
            effects: vec![RawSkillEffect {
                modifier: 15000.0,
                target: SkillTarget::SelfTarget,
                effect_type: 27, // TargetSpeed (in ACTIVE_EFFECT_TYPES)
                value_usage: Some(1),
                value_level_usage: Some(1),
            }],
        }],
    }
}

/// Mirrors skill 110101 (Joyful Voyage!): a unique that fires in a narrow
/// remain-distance window near 200m, with a long current/target-speed effect.
fn near_finish_unique(id: &str) -> Skill {
    Skill {
        skill_id: SkillId::new(id.to_owned()),
        rarity: SkillRarity::Unique,
        alternatives: vec![
            SkillAlternative {
                base_duration: 50000.0,
                cooldown_time: None,
                condition:
                    "distance_diff_top<=5&order>=2&order_rate<=40&remain_distance<=201&remain_distance>=199"
                        .to_owned(),
                precondition: None,
                effects: vec![
                    RawSkillEffect {
                        modifier: 3500.0,
                        target: SkillTarget::SelfTarget,
                        effect_type: 27,
                        value_usage: None,
                        value_level_usage: None,
                    },
                    RawSkillEffect {
                        modifier: 1500.0,
                        target: SkillTarget::SelfTarget,
                        effect_type: 22,
                        value_usage: None,
                        value_level_usage: None,
                    },
                ],
            },
            SkillAlternative {
                base_duration: 50000.0,
                cooldown_time: None,
                condition: "order>=2&order_rate<=40&remain_distance<=201&remain_distance>=199"
                    .to_owned(),
                precondition: None,
                effects: vec![RawSkillEffect {
                    modifier: 3500.0,
                    target: SkillTarget::SelfTarget,
                    effect_type: 27,
                    value_usage: None,
                    value_level_usage: None,
                }],
            },
        ],
    }
}

fn compare_runner(skills: Vec<Skill>) -> CreateRunner {
    CreateRunner {
        outfit_id: "100302".to_owned(),
        name: "R".to_owned(),
        mood: Mood::Normal,
        strategy: Strategy::FrontRunner,
        aptitudes: RunnerAptitudes {
            distance: Aptitude::A,
            strategy: Aptitude::A,
            surface: Aptitude::A,
        },
        stats: StatLine {
            speed: 1100,
            stamina: 1100,
            power: 900,
            guts: 400,
            wit: 400,
        },
        skills,
        forced_positions: HashMap::new(),
        injected_debuffs: vec![],
        forced_rushed_regions: vec![],
        forced_dueling_regions: vec![],
        forced_spot_struggle_regions: vec![],
        forced_rank: vec![],
    }
}

#[test]
fn compare_collector_captures_activating_duration_skill() {
    let data = run_compare(CompareSimParams {
        course: course(),
        ground: GroundCondition::Firm,
        parameters: params(),
        settings: compare_settings(),
        dueling_rates: dueling_rates(),
        runners: vec![compare_runner(vec![target_speed_skill("999001")])],
        nsamples: 5,
        master_seed: 7,
    })
    .expect("compare run");

    let activation_rounds = data
        .rounds
        .iter()
        .filter(|round| {
            round.runners.first().is_some_and(|r| {
                r.skill_activations
                    .get("999001")
                    .is_some_and(|logs| !logs.is_empty())
            })
        })
        .count();

    // The skill activates every round (front-runner vacuum, phase>=1), so its
    // duration effect MUST produce non-empty activation logs.
    assert!(
        activation_rounds > 0,
        "expected non-empty skillActivations for an activating duration skill, got {activation_rounds} rounds"
    );
}

#[test]
fn compare_collector_captures_near_finish_unique() {
    let data = run_compare(CompareSimParams {
        course: course(),
        ground: GroundCondition::Firm,
        parameters: params(),
        settings: compare_settings(),
        dueling_rates: dueling_rates(),
        runners: vec![compare_runner(vec![near_finish_unique("110101")])],
        nsamples: 5,
        master_seed: 7,
    })
    .expect("compare run");

    let used_rounds = data
        .rounds
        .iter()
        .filter(|round| {
            round
                .runners
                .first()
                .is_some_and(|r| r.used_skills.iter().any(|s| s == "110101"))
        })
        .count();
    let activation_rounds = data
        .rounds
        .iter()
        .filter(|round| {
            round.runners.first().is_some_and(|r| {
                r.skill_activations
                    .get("110101")
                    .is_some_and(|logs| !logs.is_empty())
            })
        })
        .count();

    // Bug #1: the skill is used but its near-finish duration effects are not
    // captured as activation logs.
    assert!(
        used_rounds > 0,
        "skill should activate (used) in some rounds"
    );
    assert_eq!(
        used_rounds, activation_rounds,
        "every round that uses the skill must capture its activation logs (used={used_rounds}, captured={activation_rounds})"
    );
}

fn dbg_course() -> CourseData {
    use uma_sim_core::course::model::{Corner, Slope, Straight};
    CourseData {
        course_id: 10914,
        race_track_id: 10009,
        distance: 3200.0,
        distance_type: DistanceType::Long,
        surface: Surface::Turf,
        turn: Orientation::Clockwise,
        course_set_status: vec![],
        corners: vec![
            Corner {
                start: 370.0,
                length: 350.0,
            },
            Corner {
                start: 720.0,
                length: 350.0,
            },
            Corner {
                start: 1520.0,
                length: 190.0,
            },
            Corner {
                start: 1710.0,
                length: 190.0,
            },
            Corner {
                start: 2250.0,
                length: 300.0,
            },
            Corner {
                start: 2550.0,
                length: 300.0,
            },
        ],
        straights: vec![
            Straight {
                start: 0.0,
                end: 370.0,
                front_type: 2,
            },
            Straight {
                start: 1070.0,
                end: 1520.0,
                front_type: 1,
            },
            Straight {
                start: 1900.0,
                end: 2250.0,
                front_type: 2,
            },
            Straight {
                start: 2850.0,
                end: 3200.0,
                front_type: 1,
            },
        ],
        slopes: vec![
            Slope {
                start: 870.0,
                length: 400.0,
                slope: -10000.0,
            },
            Slope {
                start: 1325.0,
                length: 120.0,
                slope: 20000.0,
            },
            Slope {
                start: 2400.0,
                length: 595.0,
                slope: -10000.0,
            },
            Slope {
                start: 3000.0,
                length: 125.0,
                slope: 20000.0,
            },
        ],
        lane_max: 12500.0,
        course_width: 11.25,
        horse_lane: 0.625,
        lane_change_acceleration: 0.03,
        lane_change_acceleration_per_frame: 0.002,
        max_lane_distance: 14.0625,
        move_lane_point: 370.0,
    }
}

// A target-speed skill whose precondition is an EMPTY STRING — mirrors the real
// data shape for all_corner_random / straightaway whites. Empty preconditions
// must be treated as "no precondition" (Bug #2: they previously failed to parse,
// so the skill never activated).
fn empty_precondition_skill(id: &str, cond: &str) -> Skill {
    Skill {
        skill_id: SkillId::new(id.to_owned()),
        rarity: SkillRarity::White,
        alternatives: vec![SkillAlternative {
            base_duration: 24000.0,
            cooldown_time: Some(300000.0),
            condition: cond.to_owned(),
            precondition: Some(String::new()),
            effects: vec![RawSkillEffect {
                modifier: 1500.0,
                target: SkillTarget::SelfTarget,
                effect_type: 27,
                value_usage: Some(1),
                value_level_usage: Some(1),
            }],
        }],
    }
}

// A green SpeedUp passive (type 1) with empty precondition — mirrors 200012.
fn green_speed_skill(id: &str) -> Skill {
    Skill {
        skill_id: SkillId::new(id.to_owned()),
        rarity: SkillRarity::White,
        alternatives: vec![SkillAlternative {
            base_duration: -1.0,
            cooldown_time: Some(0.0),
            condition: "rotation==1".to_owned(),
            precondition: Some(String::new()),
            effects: vec![RawSkillEffect {
                modifier: 400000.0,
                target: SkillTarget::SelfTarget,
                effect_type: 1,
                value_usage: Some(1),
                value_level_usage: Some(1),
            }],
        }],
    }
}

#[test]
fn empty_precondition_skill_activates() {
    for (id, cond) in [
        ("200332", "all_corner_random==1"),
        ("200362", "straight_random==1"),
        ("200012", "rotation==1"),
    ] {
        let data = run_compare(CompareSimParams {
            course: dbg_course(),
            ground: GroundCondition::Firm,
            parameters: params(),
            settings: compare_settings(),
            dueling_rates: dueling_rates(),
            runners: vec![compare_runner(vec![empty_precondition_skill(id, cond)])],
            nsamples: 50,
            master_seed: 0,
        })
        .expect("compare run");
        let used = data
            .rounds
            .iter()
            .filter(|r| r.runners.first().is_some_and(|x| !x.used_skills.is_empty()))
            .count();
        // Empty-precondition skills must still activate (Bug #2 regression).
        assert!(
            used > 0,
            "skill {id} ({cond}) with empty precondition never activated"
        );
    }
}

#[test]
fn green_stat_skills_do_not_accumulate_across_rounds() {
    // A green SpeedUp permanently bumps adjusted_stats.speed. If stats are not
    // reset per round, the bump accumulates over a batch run, exploding the
    // late-round velocity. Assert the peak velocity is stable across rounds.
    let data = run_compare(CompareSimParams {
        course: dbg_course(),
        ground: GroundCondition::Firm,
        parameters: params(),
        settings: compare_settings(),
        dueling_rates: dueling_rates(),
        runners: vec![compare_runner(vec![green_speed_skill("200012")])],
        nsamples: 30,
        master_seed: 0,
    })
    .expect("compare run");

    let peak = |round: &uma_sim_core::application::collectors::CompareRound| {
        round
            .runners
            .first()
            .map_or(0.0, |r| r.velocity.iter().copied().fold(0.0_f64, f64::max))
    };
    let first = peak(&data.rounds[0]);
    let last = peak(&data.rounds[data.rounds.len() - 1]);
    assert!(
        (last - first).abs() < 1.0,
        "green stat skill accumulated across rounds: peakV round0={first:.3} roundN={last:.3}"
    );
}
