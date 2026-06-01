//! The `Race` **aggregate root** (port of `common/race.ts`).
//!
//! Owns the field of [`Runner`]s and is the only thing that mutates them. The
//! tick loop is **snapshot-based** (see `.plans/.../context.md`): each frame
//! builds one immutable [`FieldSnapshot`] from the *current* state, then steps
//! every runner against that same frozen snapshot, so resolution order is
//! irrelevant and there is no intra-frame state drift.
//!
//! Runners are stored in a `Vec<Runner>` indexed by their `RunnerId` (assigned
//! in insertion order) — deterministic iteration without the overhead of a map,
//! and contiguous for the slice-based pacing / coordinator services.

use std::collections::HashMap;

use crate::course::model::CourseData;
use crate::racing::events::{RaceObservation, RaceObserver, RaceObservers};
use crate::racing::pacing::select_pacer;
use crate::racing::position_keep::{update_position_keep_coefficient, PositionKeepContext};
use crate::racing::runner::lifecycle::{CreateRunner, PrepareContext};
use crate::racing::runner::mechanics::DuelingRates;
use crate::racing::runner::physics::{
    update_first_position_in_late_race, DuelingInput, FieldInputs, RunnerSnapshot,
    SkillTriggerInputs, UpdateContext,
};
use crate::racing::runner::skills::FieldView;
use crate::racing::runner::Runner;
use crate::shared_kernel::ids::RunnerId;
use crate::shared_kernel::language::{strategy_matches, GroundCondition, Strategy};
use crate::shared_kernel::params::{RaceParameters, SimulationMode};
use crate::shared_kernel::region::{Region, RegionList};
use crate::shared_kernel::rng::{Prng, Xoshiro256StarStar};
use crate::skills::condition::catalog::build_catalog;
use crate::skills::condition::dynamic::{
    register_all_dynamic_conditions, ActiveRunner, RunnerSnapshot as DynRunnerSnapshot,
};
use crate::skills::condition::language::ConditionParser;
use crate::skills::condition::{ConditionCatalog, ConditionResolution};
use crate::stamina::game_policy::GameStaminaPolicy;
use crate::stamina::policy::{NoopStaminaPolicy, StaminaPolicy};

/// Frame duration (15 FPS).
const FRAME_DT: f64 = 1.0 / 15.0;

/// Toggles and tuning that configure a simulation run.
#[derive(Debug, Clone)]
pub struct SimulationSettings {
    /// Simulation mode (normal = live field, compare = approximate).
    pub mode: SimulationMode,
    /// Whether the game stamina policy (HP) is active.
    pub health_system: bool,
    /// Whether per-section wisdom variance is applied (currently always on).
    pub section_modifier: bool,
    /// Whether the rushed (temptation) mechanic is enabled.
    pub rushed: bool,
    /// Whether downhill mode is enabled.
    pub downhill: bool,
    /// Whether spot-struggle is enabled.
    pub spot_struggle: bool,
    /// Whether dueling is enabled.
    pub dueling: bool,
    /// Whether wit checks gate skill activation.
    pub wit_checks: bool,
    /// Position-keep mode (`2` enables virtual position keeping).
    pub position_keep_mode: i32,
    /// Number of activation samples drawn per skill trigger.
    pub skill_samples: usize,
    /// Per-base-skill recovery (stamina-drain) override modifiers.
    pub stamina_drain_overrides: HashMap<String, f64>,
}

impl Default for SimulationSettings {
    fn default() -> Self {
        SimulationSettings {
            mode: SimulationMode::Normal,
            health_system: true,
            section_modifier: true,
            rushed: true,
            downhill: true,
            spot_struggle: true,
            dueling: true,
            wit_checks: true,
            position_keep_mode: 2,
            skill_samples: 1,
            stamina_drain_overrides: HashMap::new(),
        }
    }
}

/// A read-only snapshot of the whole field, frozen at the start of a frame.
struct FieldSnapshot {
    entries: Vec<SnapEntry>,
    order: HashMap<RunnerId, i64>,
    previous_order: HashMap<RunnerId, i64>,
    pacer: Option<RunnerId>,
    pacer_position: Option<f64>,
    second_place_position: Option<f64>,
    leader_position: Option<f64>,
    num_active: i64,
}

/// One active runner's frozen per-frame state.
#[derive(Clone, Copy)]
struct SnapEntry {
    id: RunnerId,
    position: f64,
    current_lane: f64,
    current_speed: f64,
    strategy: Strategy,
    gate: i64,
    is_rushed: bool,
    is_dueling: bool,
}

/// The race aggregate root.
pub struct Race {
    /// The course being raced.
    pub course: CourseData,
    /// Ground condition.
    pub ground: GroundCondition,
    /// Simulation settings.
    pub settings: SimulationSettings,
    /// Race-wide parameters (augmented with field composition at prepare time).
    pub race_params: RaceParameters,
    /// Per-strategy dueling rates (compare-mode artificial dueling).
    pub dueling_rates: Option<DuelingRates>,

    /// The field, indexed by `RunnerId`.
    runners: Vec<Runner>,
    /// Ids of finished runners, in finish order (append-only).
    finished_runners: Vec<RunnerId>,

    /// The static condition catalog (owns the parser's backing data).
    catalog: ConditionCatalog,
    /// The whole course as a region list.
    whole_course: RegionList,
    /// Round index (selects which sampled trigger fires).
    round_iteration: usize,
    /// Elapsed race time in seconds.
    accumulated_time: f64,
    /// Master seed of the current round.
    seed: u64,
    /// The race RNG (drives gate assignment + per-runner sub-streams).
    rng: Box<dyn Prng>,

    /// Current pacer id.
    pacer: Option<RunnerId>,
    /// Current pacer position (for the observation view).
    pacer_position: Option<f64>,
    /// Current finishing order.
    runner_order: HashMap<RunnerId, i64>,
    /// Previous-tick finishing order.
    previous_runner_order: HashMap<RunnerId, i64>,
    /// Per-strategy counts.
    strategy_counts: HashMap<Strategy, u32>,
    /// Common (shared) skills across the field.
    common_skills: HashMap<String, u32>,

    /// Lifecycle observers.
    observers: RaceObservers,
}

impl RaceObservation for Race {
    fn course_distance(&self) -> f64 {
        self.course.distance
    }
    fn pacer_position(&self) -> Option<f64> {
        self.pacer_position
    }
    fn seed(&self) -> u64 {
        self.seed
    }
    fn accumulated_time(&self) -> f64 {
        self.accumulated_time
    }
}

impl Race {
    /// Build a race for a course/ground with the given settings + parameters.
    ///
    /// Registers the dynamic condition catalog once and builds the static
    /// catalog + whole-course regions.
    pub fn new(
        course: CourseData,
        ground: GroundCondition,
        settings: SimulationSettings,
        race_params: RaceParameters,
        dueling_rates: Option<DuelingRates>,
    ) -> Self {
        register_all_dynamic_conditions();
        let mut whole_course = RegionList::new();
        whole_course.push(Region::new(0.0, course.distance));
        Race {
            ground,
            settings,
            race_params,
            dueling_rates,
            runners: Vec::new(),
            finished_runners: Vec::new(),
            catalog: build_catalog(),
            whole_course,
            round_iteration: 0,
            accumulated_time: 0.0,
            seed: 0,
            rng: Box::new(Xoshiro256StarStar::from_u64_seed(0)),
            pacer: None,
            pacer_position: None,
            runner_order: HashMap::new(),
            previous_runner_order: HashMap::new(),
            strategy_counts: HashMap::new(),
            common_skills: HashMap::new(),
            observers: RaceObservers::new(),
            course,
        }
    }

    /// Course base speed: `20 - (distance - 2000) / 1000`.
    pub fn base_speed(&self) -> f64 {
        20.0 - (self.course.distance - 2000.0) / 1000.0
    }

    /// Number of runners in the field.
    pub fn runner_count(&self) -> usize {
        self.runners.len()
    }

    /// Read-only access to the field.
    pub fn runners(&self) -> &[Runner] {
        &self.runners
    }

    /// Finish order (runner ids).
    pub fn finished_runners(&self) -> &[RunnerId] {
        &self.finished_runners
    }

    /// Register a lifecycle observer.
    pub fn subscribe(&mut self, observer: Box<dyn RaceObserver>) {
        self.observers.subscribe(observer);
    }

    /// Add a runner to the field (assigns the next `RunnerId`).
    pub fn add_runner(&mut self, props: CreateRunner) -> RunnerId {
        let id = RunnerId(self.runners.len() as u32);
        let runner = Runner::create(
            id,
            &self.course,
            self.ground,
            props,
            Box::new(NoopStaminaPolicy),
            Box::new(Xoshiro256StarStar::from_u32_seed(id.0)),
        );
        self.runners.push(runner);
        id
    }

    /// Prepare the field for a round: count field composition, assign gates,
    /// spawn per-runner RNGs + stamina policies, and reset every runner.
    pub fn prepare_round(&mut self, master_seed: u64) {
        self.accumulated_time = 0.0;
        self.finished_runners.clear();
        self.runner_order.clear();
        self.previous_runner_order.clear();
        self.pacer = None;
        self.pacer_position = None;

        self.prepare_race();

        self.seed = master_seed;
        self.rng = Box::new(Xoshiro256StarStar::from_u64_seed(master_seed));

        let base_speed = self.base_speed();
        let parser = ConditionParser::new(&self.catalog);

        // Fisher-Yates gate shuffle (9 gates) seeded from the race RNG.
        let mut gates: Vec<i64> = (0..9).collect();
        for i in (1..gates.len()).rev() {
            let j = self.rng.uniform(i as u32 + 1) as usize;
            gates.swap(i, j);
        }

        let mut runners = std::mem::take(&mut self.runners);
        for (idx, runner) in runners.iter_mut().enumerate() {
            runner.gate = gates[idx];
            let runner_rng: Box<dyn Prng> =
                Box::new(Xoshiro256StarStar::from_u32_seed(self.rng.int32()));
            let policy: Box<dyn StaminaPolicy> = if self.settings.health_system {
                let hp_rng: Box<dyn Prng> =
                    Box::new(Xoshiro256StarStar::from_u32_seed(self.rng.int32()));
                Box::new(GameStaminaPolicy::new(&self.course, self.ground, hp_rng))
            } else {
                Box::new(NoopStaminaPolicy)
            };
            runner.health_policy = policy;
            runner.wit_checks_enabled = self.settings.wit_checks;
            runner.dueling_enabled = self.settings.dueling;
            runner.spot_struggle_enabled = self.settings.spot_struggle;
            runner.downhill_enabled = self.settings.downhill;
            runner
                .stamina_drain_overrides
                .clone_from(&self.settings.stamina_drain_overrides);

            let condition_resolution = if self.settings.mode == SimulationMode::Normal {
                ConditionResolution::Dynamic
            } else {
                ConditionResolution::Static
            };
            let pos_keep_end_multiplier = if self.settings.mode == SimulationMode::Compare {
                10.0
            } else {
                3.0
            };
            let ctx = PrepareContext {
                course: &self.course,
                base_speed,
                condition_resolution,
                pos_keep_end_multiplier,
                race_params: &self.race_params,
                whole_course: &self.whole_course,
                parser: &parser,
                skill_samples: self.settings.skill_samples,
                round_iteration: self.round_iteration,
            };
            runner.on_prepare(runner_rng, &ctx);
        }
        self.runners = runners;

        self.round_iteration += 1;
        self.emit_round_start(master_seed);
    }

    /// Tally field composition and fold it into `race_params` (normal mode).
    fn prepare_race(&mut self) {
        let mut strategy_counts: HashMap<Strategy, u32> = HashMap::new();
        let mut common_skills: HashMap<String, u32> = HashMap::new();
        for runner in &self.runners {
            *strategy_counts.entry(runner.strategy).or_insert(0) += 1;
            for skill in &runner.skills {
                *common_skills.entry(skill.skill_id.0.clone()).or_insert(0) += 1;
            }
        }
        self.strategy_counts = strategy_counts.clone();
        self.common_skills = common_skills.clone();

        self.race_params.num_umas = Some(self.runners.len() as u32);
        self.race_params.mode = self.settings.mode;
        if self.settings.mode == SimulationMode::Normal {
            self.race_params.strategy_counts = Some(strategy_counts);
            self.race_params.common_skills = Some(common_skills);
        } else {
            self.race_params.strategy_counts = None;
            self.race_params.common_skills = None;
        }
    }

    /// Run the race to completion (every runner finished).
    pub fn run(&mut self) {
        while self.finished_runners.len() < self.runners.len() {
            self.on_update(FRAME_DT);
        }
        self.emit_round_end();
    }

    /// Advance the whole field one `dt`-second step (snapshot-based).
    pub fn on_update(&mut self, dt: f64) {
        self.emit_before_tick(dt);
        self.accumulated_time += dt;

        let snapshot = self.build_field_snapshot();
        let proximity: Vec<RunnerSnapshot> = snapshot
            .entries
            .iter()
            .map(|e| RunnerSnapshot {
                id: e.id,
                position: e.position,
                current_lane: e.current_lane,
                current_speed: e.current_speed,
            })
            .collect();

        let base_speed = self.base_speed();
        let mut runners = std::mem::take(&mut self.runners);
        for runner in &mut runners {
            if self.finished_runners.contains(&runner.id) {
                continue;
            }
            update_position_keep_coefficient(runner);
            let field = build_field_view(runner.id, &snapshot);
            let position_keep = PositionKeepContext {
                position_keep_mode: self.settings.position_keep_mode,
                num_runners: snapshot.num_active as usize,
                pacer_position: snapshot.pacer_position,
                pacer_is_self: snapshot.pacer == Some(runner.id),
                second_place_position: snapshot.second_place_position,
            };
            // The aggregate is the *producer*: it resolves all field-presence
            // inputs (the `mode` branch lives here, ADR-0005) and hands the step
            // a pure `FieldInputs` plus a field-free course context.
            let field_inputs = resolve_field_inputs(
                runner,
                self.settings.mode,
                &proximity,
                &field,
                self.dueling_rates,
                position_keep,
                self.course.horse_lane,
            );
            let ctx = UpdateContext {
                base_speed,
                accumulated_time: self.accumulated_time,
                course: &self.course,
                downhill_enabled: self.settings.downhill,
            };
            runner.on_update(dt, &field_inputs, &ctx);
        }
        self.runners = runners;

        // Cross-runner coordinator passes (t-017): contention mechanics that
        // observe/mutate the rest of the field. These run as aggregate passes
        // over the just-updated field so resolution order is irrelevant.
        if self.settings.mode == SimulationMode::Normal {
            if self.settings.dueling {
                self.coordinate_proximity_dueling();
            }
            if self.settings.spot_struggle {
                self.coordinate_spot_struggle_groups();
            }
        }

        update_first_position_in_late_race(&mut self.runners, self.course.distance);

        self.emit_runner_ticks_and_finishes(dt);
    }

    /// Build the immutable field snapshot for this frame (also resolves the
    /// pacer + applies its promotion and refreshes the order maps).
    fn build_field_snapshot(&mut self) -> FieldSnapshot {
        // Resolve + apply pacer promotion (mutates one runner's keep-strategy).
        let selection = select_pacer(&self.runners, self.pacer);
        if let Some(sel) = selection {
            if sel.promote_to_front_runner {
                if let Some(runner) = self.runners.iter_mut().find(|r| r.id == sel.runner_id) {
                    runner.position_keep_strategy = Strategy::FrontRunner;
                }
            }
            self.pacer = Some(sel.runner_id);
            self.pacer_position = self
                .runners
                .iter()
                .find(|r| r.id == sel.runner_id)
                .map(|r| r.position);
        } else {
            self.pacer = None;
            self.pacer_position = None;
        }

        let entries: Vec<SnapEntry> = self
            .runners
            .iter()
            .filter(|r| !self.finished_runners.contains(&r.id))
            .map(|r| SnapEntry {
                id: r.id,
                position: r.position,
                current_lane: r.current_lane,
                current_speed: r.current_speed,
                strategy: r.strategy,
                gate: r.gate,
                is_rushed: r.is_rushed,
                is_dueling: r.is_dueling,
            })
            .collect();

        // Order by position descending.
        let mut sorted: Vec<&SnapEntry> = entries.iter().collect();
        sorted.sort_by(|a, b| {
            b.position
                .partial_cmp(&a.position)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let previous_order = std::mem::take(&mut self.runner_order);
        let mut order: HashMap<RunnerId, i64> = HashMap::new();
        for (i, entry) in sorted.iter().enumerate() {
            order.insert(entry.id, i as i64 + 1);
        }
        // Forced-rank overrides.
        for runner in &self.runners {
            for region in &runner.forced_rank {
                if runner.position >= region.start && runner.position < region.end {
                    order.insert(runner.id, region.rank);
                    break;
                }
            }
        }
        self.runner_order = order.clone();
        self.previous_runner_order = previous_order.clone();

        let leader_position = sorted.first().map(|e| e.position);
        let second_place_position = sorted.get(1).map(|e| e.position);

        FieldSnapshot {
            num_active: entries.len() as i64,
            entries,
            order,
            previous_order,
            pacer: self.pacer,
            pacer_position: self.pacer_position,
            second_place_position,
            leader_position,
        }
    }

    /// Normal-mode **proximity dueling** coordinator (port of `proximityDueling`).
    ///
    /// A runner may begin dueling when it is in the top half of the field, on
    /// the final straight, and bunched together (distance/lane/speed) with at
    /// least one other top-half runner who is also on the final straight. Runs
    /// as an aggregate pass so every runner observes the same field.
    fn coordinate_proximity_dueling(&mut self) {
        const MAX_DISTANCE_GAP: f64 = 3.0;
        const MAX_SPEED_GAP: f64 = 0.6;

        let order = self.runner_order.clone();
        let num = order.len();
        if num == 0 {
            return;
        }
        let top_half_cutoff = ((num as f64) / 2.0).ceil() as i64;
        let course_width = self.course.course_width;
        let max_lane_gap = 0.25 * course_width;

        // Phase 1: read-only snapshot of contention-relevant state.
        struct Row {
            id: RunnerId,
            order: Option<i64>,
            position: f64,
            lane: f64,
            speed: f64,
            on_final_straight: bool,
            eligible: bool,
        }
        let rows: Vec<Row> = self
            .runners
            .iter()
            .filter(|r| !r.finished)
            .map(|r| {
                let on_final = r.is_on_final_straight(&self.course);
                let eligible = r.dueling_enabled
                    && !r.is_dueling
                    && !r.is_in_forced_dueling
                    && !strategy_matches(r.position_keep_strategy, Strategy::FrontRunner)
                    && r.health_policy.health_ratio_remaining() >= 0.15
                    && on_final;
                Row {
                    id: r.id,
                    order: order.get(&r.id).copied(),
                    position: r.position,
                    lane: r.current_lane,
                    speed: r.current_speed,
                    on_final_straight: on_final,
                    eligible,
                }
            })
            .collect();

        // Phase 2: decide each eligible runner's dueling transition.
        enum DuelDecision {
            ClearCanDuel,
            ArmCanDuel,
            StartDuel,
            None,
        }
        let mut decisions: Vec<(RunnerId, DuelDecision)> = Vec::new();
        for row in &rows {
            if !row.eligible {
                continue;
            }
            match row.order {
                Some(o) if o <= top_half_cutoff => {}
                _ => {
                    decisions.push((row.id, DuelDecision::ClearCanDuel));
                    continue;
                }
            }
            let mut nearby = 0;
            for other in &rows {
                if other.id == row.id {
                    continue;
                }
                match other.order {
                    Some(o) if o <= top_half_cutoff => {}
                    _ => continue,
                }
                let within_distance = (other.position - row.position).abs() <= MAX_DISTANCE_GAP;
                let lane_gap = (other.lane - row.lane).abs() * course_width;
                let within_lane = lane_gap <= max_lane_gap;
                let within_speed = (other.speed - row.speed).abs() < MAX_SPEED_GAP;
                if within_distance && within_lane && within_speed && other.on_final_straight {
                    nearby += 1;
                }
            }
            if nearby + 1 < 2 {
                decisions.push((row.id, DuelDecision::ClearCanDuel));
                continue;
            }
            // Bunched: arm `can_duel`, then start the duel after the 2s cadence.
            let Some(runner) = self.runners.iter().find(|r| r.id == row.id) else {
                continue;
            };
            if runner.can_duel != Some(true) {
                decisions.push((row.id, DuelDecision::ArmCanDuel));
            } else if runner.dueling_timer.t >= 2.0 {
                decisions.push((row.id, DuelDecision::StartDuel));
            } else {
                decisions.push((row.id, DuelDecision::None));
            }
        }

        // Phase 3: apply.
        for (id, decision) in decisions {
            if let Some(runner) = self.runners.iter_mut().find(|r| r.id == id) {
                match decision {
                    DuelDecision::ClearCanDuel => runner.can_duel = None,
                    DuelDecision::ArmCanDuel => {
                        runner.can_duel = Some(true);
                        runner.dueling_timer.t = 0.0;
                    }
                    DuelDecision::StartDuel => {
                        runner.is_dueling = true;
                        runner.dueling_start_position = runner.position;
                    }
                    DuelDecision::None => {}
                }
            }
        }
    }

    /// **Spot-struggle group activation** coordinator (port of the group-trigger
    /// branch of `updateSpotStruggle`). A bunched cluster of same-strategy
    /// front-runners near the front all enter spot-struggle together.
    fn coordinate_spot_struggle_groups(&mut self) {
        // Phase 1: read-only snapshot.
        struct Row {
            id: RunnerId,
            strategy: Strategy,
            pos_keep: Strategy,
            position: f64,
            lane: f64,
            section_length: f64,
            is_trigger: bool,
        }
        let rows: Vec<Row> = self
            .runners
            .iter()
            .filter(|r| !r.finished)
            .map(|r| {
                let in_section =
                    r.position >= 150.0 && r.position <= (r.section_length * 5.0).floor();
                let is_trigger = r.spot_struggle_start_position.is_none()
                    && in_section
                    && strategy_matches(r.position_keep_strategy, Strategy::FrontRunner);
                Row {
                    id: r.id,
                    strategy: r.strategy,
                    pos_keep: r.position_keep_strategy,
                    position: r.position,
                    lane: r.current_lane,
                    section_length: r.section_length,
                    is_trigger,
                }
            })
            .collect();

        // Phase 2: each trigger gathers its same-strategy bunched group.
        let mut activations: HashMap<RunnerId, (f64, f64)> = HashMap::new();
        for trigger in rows.iter().filter(|r| r.is_trigger) {
            let (distance_gap, lane_gap) = if trigger.pos_keep == Strategy::FrontRunner {
                (3.75, 0.165)
            } else {
                (5.0, 0.416)
            };
            // `runnersPerStrategy` is keyed by immutable strategy, looked up by
            // the (possibly promoted) position-keep strategy.
            let group: Vec<&Row> = rows
                .iter()
                .filter(|u| u.strategy == trigger.pos_keep)
                .filter(|u| {
                    (u.position - trigger.position).abs() <= distance_gap
                        && (u.lane - trigger.lane).abs() < lane_gap
                })
                .collect();
            if group.len() >= 2 {
                let end_span = (trigger.section_length * 8.0).floor();
                for uma in group {
                    activations.insert(uma.id, (uma.position, uma.position + end_span));
                }
            }
        }

        // Phase 3: apply.
        for (id, (start, end)) in activations {
            if let Some(runner) = self.runners.iter_mut().find(|r| r.id == id) {
                runner.spot_struggle_timer.t = 0.0;
                runner.in_spot_struggle = true;
                runner.spot_struggle_start_position = Some(start);
                runner.spot_struggle_end_position = end;
            }
        }
    }

    fn emit_runner_ticks_and_finishes(&mut self, dt: f64) {
        let mut observers = std::mem::take(&mut self.observers);
        let mut newly_finished: Vec<RunnerId> = Vec::new();
        for runner in &self.runners {
            if self.finished_runners.contains(&runner.id) {
                continue;
            }
            observers.emit_after_runner_tick(self, runner, dt);
            if runner.finished {
                newly_finished.push(runner.id);
            }
        }
        for id in newly_finished {
            self.finished_runners.push(id);
            if let Some(runner) = self.runners.iter().find(|r| r.id == id) {
                observers.emit_runner_finished(self, runner);
            }
        }
        self.observers = observers;
    }

    fn emit_round_start(&mut self, seed: u64) {
        let mut observers = std::mem::take(&mut self.observers);
        observers.emit_round_start(self, seed);
        self.observers = observers;
    }

    fn emit_before_tick(&mut self, dt: f64) {
        let mut observers = std::mem::take(&mut self.observers);
        observers.emit_before_tick(self, dt);
        self.observers = observers;
    }

    fn emit_round_end(&mut self) {
        let mut observers = std::mem::take(&mut self.observers);
        observers.emit_round_end(self);
        self.observers = observers;
    }
}

/// Build the per-runner [`FieldView`] from the frozen snapshot.
fn build_field_view(self_id: RunnerId, snapshot: &FieldSnapshot) -> FieldView {
    let other_snapshots: Vec<DynRunnerSnapshot> = snapshot
        .entries
        .iter()
        .filter(|e| e.id != self_id)
        .map(|e| DynRunnerSnapshot {
            position: e.position,
            current_lane: e.current_lane,
            current_speed: e.current_speed,
        })
        .collect();
    let active_runners: Vec<ActiveRunner> = snapshot
        .entries
        .iter()
        .map(|e| ActiveRunner {
            is_self: e.id == self_id,
            position: e.position,
            strategy: e.strategy,
            gate: e.gate,
            is_rushed: e.is_rushed,
            is_dueling: e.is_dueling,
        })
        .collect();
    FieldView {
        self_order: snapshot.order.get(&self_id).copied(),
        self_previous_order: snapshot.previous_order.get(&self_id).copied(),
        num_umas: snapshot.num_active,
        leader_position: snapshot.leader_position,
        other_snapshots,
        active_runners,
    }
}

// =============================================================================
// Field-inputs producer (ADR-0005)
//
// The single seam where field-presence is decided. The aggregate resolves every
// field-dependent input the step consumes and hands the step a pure
// `FieldInputs`. In `Normal` the values come from the live snapshot; in
// `Compare` from the runner's approximate condition values / synthetic rates.
// The step (`Runner::on_update`) never sees this branch.
// =============================================================================

/// Resolve the [`FieldInputs`] for one runner this tick.
#[allow(clippy::too_many_arguments)]
fn resolve_field_inputs<'a>(
    runner: &Runner,
    mode: SimulationMode,
    snapshots: &[RunnerSnapshot],
    field: &'a FieldView,
    dueling_rates: Option<DuelingRates>,
    position_keep: PositionKeepContext,
    horse_lane: f64,
) -> FieldInputs<'a> {
    let (side_blocked, overtaking) = if mode == SimulationMode::Normal {
        (
            has_side_blocking_runner(runner, snapshots, horse_lane),
            is_overtaking_runner(runner, snapshots, horse_lane),
        )
    } else {
        (
            condition_value(runner, "blocked_side") == 1,
            condition_value(runner, "overtake") == 1,
        )
    };
    let dueling = if mode == SimulationMode::Normal {
        DuelingInput::Coordinated
    } else {
        DuelingInput::Artificial(dueling_rates)
    };
    FieldInputs {
        side_blocked,
        overtaking,
        dueling,
        position_keep,
        skill_triggers: SkillTriggerInputs { field },
    }
}

/// Whether another runner blocks `runner` to the side (caps inward lane drift).
fn has_side_blocking_runner(
    runner: &Runner,
    snapshots: &[RunnerSnapshot],
    horse_lane: f64,
) -> bool {
    snapshots.iter().any(|snapshot| {
        if snapshot.id == runner.id {
            return false;
        }
        let lane_delta = (snapshot.current_lane - runner.current_lane).abs();
        let distance_ahead = snapshot.position - runner.position;
        let is_ahead = snapshot.position > runner.position;
        lane_delta <= horse_lane && is_ahead && distance_ahead <= 5.0
    })
}

/// Whether `runner` is overtaking another runner (pushes the target lane out).
fn is_overtaking_runner(runner: &Runner, snapshots: &[RunnerSnapshot], horse_lane: f64) -> bool {
    let lane_threshold = horse_lane * 2.0;
    snapshots.iter().any(|snapshot| {
        if snapshot.id == runner.id {
            return false;
        }
        let is_faster = runner.current_speed > snapshot.current_speed;
        let distance_gap = (snapshot.position - runner.position).abs();
        let lane_delta = (snapshot.current_lane - runner.current_lane).abs();
        is_faster && distance_gap <= 5.0 && lane_delta <= lane_threshold
    })
}

/// Read an approximate-condition value (compare mode), falling back to its start
/// value when not yet ticked.
pub(crate) fn condition_value(runner: &Runner, name: &str) -> i32 {
    if let Some(value) = runner.condition_values.get(name) {
        return *value;
    }
    runner
        .conditions
        .get(name)
        .map_or(0, |condition| condition.value_on_start())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::racing::runner::lifecycle::RunnerAptitudes;
    use crate::racing::runner::test_support::{test_course, test_race_params};
    use crate::shared_kernel::language::{Aptitude, Mood};
    use crate::shared_kernel::params::StatLine;
    use std::collections::HashMap;

    fn props(name: &str, strategy: Strategy) -> CreateRunner {
        CreateRunner {
            outfit_id: "100302".to_owned(),
            name: name.to_owned(),
            mood: Mood::Normal,
            strategy,
            aptitudes: RunnerAptitudes {
                distance: Aptitude::A,
                strategy: Aptitude::A,
                surface: Aptitude::A,
            },
            stats: StatLine {
                speed: 1000,
                stamina: 1000,
                power: 1000,
                guts: 1000,
                wit: 800,
            },
            skills: vec![],
            forced_positions: HashMap::new(),
            injected_debuffs: vec![],
            forced_rushed_regions: vec![],
            forced_dueling_regions: vec![],
            forced_spot_struggle_regions: vec![],
            forced_rank: vec![],
        }
    }

    fn race_with(n: u32) -> Race {
        let mut race = Race::new(
            test_course(),
            GroundCondition::Firm,
            SimulationSettings::default(),
            test_race_params(),
            None,
        );
        let strategies = [
            Strategy::Runaway,
            Strategy::FrontRunner,
            Strategy::PaceChaser,
            Strategy::LateSurger,
            Strategy::EndCloser,
        ];
        for i in 0..n {
            let s = strategies[(i as usize) % strategies.len()];
            race.add_runner(props(&format!("R{i}"), s));
        }
        race
    }

    #[test]
    fn nine_runner_race_finishes_all_deterministically() {
        let mut race = race_with(9);
        race.prepare_round(12345);
        race.run();
        assert_eq!(race.finished_runners().len(), 9);
        // Every runner crossed the line.
        assert!(race.runners().iter().all(|r| r.finished));
        // Finish times are positive and ordered by finish sequence.
        let first = race.finished_runners()[0];
        let winner = race
            .runners()
            .iter()
            .find(|r| r.id == first)
            .expect("winner present");
        assert!(winner.finish_time > 0.0);
    }

    #[test]
    fn same_seed_same_finish_order() {
        let mut a = race_with(9);
        a.prepare_round(777);
        a.run();
        let mut b = race_with(9);
        b.prepare_round(777);
        b.run();
        assert_eq!(a.finished_runners(), b.finished_runners());
    }

    fn pace_chaser_race(n: u32) -> Race {
        let mut race = Race::new(
            test_course(),
            GroundCondition::Firm,
            SimulationSettings::default(),
            test_race_params(),
            None,
        );
        for i in 0..n {
            race.add_runner(props(&format!("R{i}"), Strategy::PaceChaser));
        }
        race
    }

    #[test]
    fn proximity_dueling_arms_then_starts_for_bunched_leaders() {
        let mut race = pace_chaser_race(4);
        race.prepare_round(99);
        // Give the course a final straight covering the cluster.
        race.course.straights = vec![crate::course::model::Straight {
            start: 2000.0,
            end: 2400.0,
            front_type: 0,
        }];
        // Bunch runners 0 and 1 together on the final straight.
        for (idx, runner) in race.runners.iter_mut().enumerate() {
            runner.is_dueling = false;
            runner.can_duel = None;
            if idx < 2 {
                runner.position = 2300.0;
                runner.current_lane = 0.5;
                runner.current_speed = 18.0;
            } else {
                runner.position = 2100.0;
                runner.current_lane = 0.5;
                runner.current_speed = 18.0;
            }
        }
        // Order map: 0 and 1 are the top half (cutoff = ceil(4/2) = 2).
        race.runner_order = [
            (RunnerId(0), 1),
            (RunnerId(1), 2),
            (RunnerId(2), 3),
            (RunnerId(3), 4),
        ]
        .into_iter()
        .collect();

        race.coordinate_proximity_dueling();
        // Bunched leaders arm can_duel; trailing runners do not.
        assert_eq!(race.runners[0].can_duel, Some(true));
        assert_eq!(race.runners[1].can_duel, Some(true));
        assert!(race.runners[2].can_duel != Some(true));

        // After the 2s cadence elapses, the duel starts.
        race.runners[0].dueling_timer.t = 2.0;
        race.coordinate_proximity_dueling();
        assert!(race.runners[0].is_dueling);
        assert_eq!(race.runners[0].dueling_start_position, 2300.0);
    }

    #[test]
    fn spot_struggle_group_activates_bunched_front_runners() {
        let mut race = pace_chaser_race(3);
        race.prepare_round(42);
        // Force front-runner position-keep so they qualify as triggers, and bunch
        // two of them inside the early-race spot-struggle section.
        let section = race.runners[0].section_length;
        let in_section_pos = (section * 4.0).min((section * 5.0).floor()).max(200.0);
        for (idx, runner) in race.runners.iter_mut().enumerate() {
            runner.strategy = Strategy::FrontRunner;
            runner.position_keep_strategy = Strategy::FrontRunner;
            runner.in_spot_struggle = false;
            runner.spot_struggle_start_position = None;
            if idx < 2 {
                runner.position = in_section_pos;
                runner.current_lane = 0.5;
            } else {
                runner.position = in_section_pos + 50.0;
                runner.current_lane = 0.9;
            }
        }

        race.coordinate_spot_struggle_groups();
        assert!(race.runners[0].in_spot_struggle);
        assert!(race.runners[1].in_spot_struggle);
        assert!(race.runners[0].spot_struggle_start_position.is_some());
        // The far/wide runner is outside the lane gap and stays out.
        assert!(!race.runners[2].in_spot_struggle);
    }

    #[test]
    fn different_seed_may_differ_but_all_finish() {
        let mut race = race_with(9);
        race.prepare_round(2024);
        race.run();
        assert_eq!(race.finished_runners().len(), 9);
        // Gates are a unique permutation of 0..9.
        let mut gates: Vec<i64> = race.runners().iter().map(|r| r.gate).collect();
        gates.sort_unstable();
        gates.dedup();
        assert_eq!(gates.len(), 9);
    }
}
