//! Field-agnostic race-orchestration **support** shared by both engines
//! (ADR-0005).
//!
//! The per-frame field snapshot, the per-runner field view, and the small
//! producer leaf-helpers (side-block / overtake proximity reads, approximate
//! condition reads) are pure mechanics over runner positions — they never ask
//! which paradigm is running. Both `uma-sim-race` (contested) and
//! `uma-sim-vacuum` (synthetic) reuse them so the snapshot machinery cannot
//! drift between engines; each engine differs only in how it *produces*
//! [`FieldInputs`](crate::runner::physics::FieldInputs) from this support.

use std::collections::HashMap;

use crate::pacing::select_pacer;
use crate::runner::physics::RunnerSnapshot;
use crate::runner::skills::FieldView;
use crate::runner::Runner;
use crate::shared_kernel::ids::RunnerId;
use crate::shared_kernel::language::Strategy;
use crate::skills::condition::dynamic::{ActiveRunner, RunnerSnapshot as DynRunnerSnapshot};

/// A read-only snapshot of the whole field, frozen at the start of a frame.
pub struct FieldSnapshot {
    /// Active (unfinished) runners' frozen per-frame state.
    pub entries: Vec<SnapEntry>,
    /// Current finishing order (1-based), with forced-rank overrides applied.
    pub order: HashMap<RunnerId, i64>,
    /// Previous-frame finishing order.
    pub previous_order: HashMap<RunnerId, i64>,
    /// The selected pacer, if any.
    pub pacer: Option<RunnerId>,
    /// The pacer's current position.
    pub pacer_position: Option<f64>,
    /// Position of the second-furthest-forward runner.
    pub second_place_position: Option<f64>,
    /// Position of the furthest-forward runner.
    pub leader_position: Option<f64>,
    /// Number of active runners.
    pub num_active: i64,
}

/// One active runner's frozen per-frame state.
#[derive(Clone, Copy)]
pub struct SnapEntry {
    /// Runner id.
    pub id: RunnerId,
    /// Longitudinal position.
    pub position: f64,
    /// Lateral lane offset.
    pub current_lane: f64,
    /// Current speed.
    pub current_speed: f64,
    /// Immutable running style.
    pub strategy: Strategy,
    /// Starting gate.
    pub gate: i64,
    /// Whether the runner is rushed.
    pub is_rushed: bool,
    /// Whether the runner is dueling.
    pub is_dueling: bool,
}

/// The aggregate's running pacer + finishing-order state, threaded across frames.
#[derive(Default)]
pub struct FieldOrderTracker {
    /// Current pacer id.
    pub pacer: Option<RunnerId>,
    /// Current pacer position (for the observation view).
    pub pacer_position: Option<f64>,
    /// Current finishing order.
    pub runner_order: HashMap<RunnerId, i64>,
    /// Previous-tick finishing order.
    pub previous_runner_order: HashMap<RunnerId, i64>,
}

impl FieldOrderTracker {
    /// A fresh tracker (no pacer, empty order maps).
    pub fn new() -> Self {
        Self::default()
    }

    /// Reset to the pre-round state.
    pub fn reset(&mut self) {
        self.pacer = None;
        self.pacer_position = None;
        self.runner_order.clear();
        self.previous_runner_order.clear();
    }
}

/// Build the immutable field snapshot for this frame: resolve + apply pacer
/// promotion (mutating one runner's keep-strategy), then freeze every active
/// runner's state and refresh the order maps in `tracker`.
pub fn build_field_snapshot(
    runners: &mut [Runner],
    finished_runners: &[RunnerId],
    tracker: &mut FieldOrderTracker,
) -> FieldSnapshot {
    // Resolve + apply pacer promotion (mutates one runner's keep-strategy).
    let selection = select_pacer(runners, tracker.pacer);
    if let Some(sel) = selection {
        if sel.promote_to_front_runner {
            if let Some(runner) = runners.iter_mut().find(|r| r.id == sel.runner_id) {
                runner.position_keep_strategy = Strategy::FrontRunner;
            }
        }
        tracker.pacer = Some(sel.runner_id);
        tracker.pacer_position = runners
            .iter()
            .find(|r| r.id == sel.runner_id)
            .map(|r| r.position);
    } else {
        tracker.pacer = None;
        tracker.pacer_position = None;
    }

    let entries: Vec<SnapEntry> = runners
        .iter()
        .filter(|r| !finished_runners.contains(&r.id))
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

    let previous_order = std::mem::take(&mut tracker.runner_order);
    let mut order: HashMap<RunnerId, i64> = HashMap::new();
    for (i, entry) in sorted.iter().enumerate() {
        order.insert(entry.id, i as i64 + 1);
    }
    // Forced-rank overrides.
    for runner in runners.iter() {
        for region in &runner.forced_rank {
            if runner.position >= region.start && runner.position < region.end {
                order.insert(runner.id, region.rank);
                break;
            }
        }
    }
    tracker.runner_order = order.clone();
    tracker.previous_runner_order = previous_order.clone();

    let leader_position = sorted.first().map(|e| e.position);
    let second_place_position = sorted.get(1).map(|e| e.position);

    FieldSnapshot {
        num_active: entries.len() as i64,
        entries,
        order,
        previous_order,
        pacer: tracker.pacer,
        pacer_position: tracker.pacer_position,
        second_place_position,
        leader_position,
    }
}

/// Project the frozen snapshot into the proximity-snapshot list the step's
/// lane-movement / side-block reads consume.
pub fn proximity_snapshots(snapshot: &FieldSnapshot) -> Vec<RunnerSnapshot> {
    snapshot
        .entries
        .iter()
        .map(|e| RunnerSnapshot {
            id: e.id,
            position: e.position,
            current_lane: e.current_lane,
            current_speed: e.current_speed,
        })
        .collect()
}

/// Build the per-runner [`FieldView`] from the frozen snapshot.
pub fn build_field_view(self_id: RunnerId, snapshot: &FieldSnapshot) -> FieldView {
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

/// Whether another runner blocks `runner` to the side (caps inward lane drift).
/// A contested-field producer reads this from the live proximity snapshot.
pub fn has_side_blocking_runner(
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
/// A contested-field producer reads this from the live proximity snapshot.
pub fn is_overtaking_runner(
    runner: &Runner,
    snapshots: &[RunnerSnapshot],
    horse_lane: f64,
) -> bool {
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

/// Read an approximate-condition value, falling back to its start value when
/// not yet ticked. A synthetic-field producer reads side-block / overtake from
/// these instead of a live field.
pub fn condition_value(runner: &Runner, name: &str) -> i32 {
    if let Some(value) = runner.condition_values.get(name) {
        return *value;
    }
    runner
        .conditions
        .get(name)
        .map_or(0, |condition| condition.value_on_start())
}
