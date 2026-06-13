//! # uma-sim-race
//!
//! The **contested** race engine (ADR-0005). Nine real runners; contention
//! (dueling, spot-struggle, position-keep, blocking) and skill/terrain
//! interactions emerge from actual field proximity. This crate owns:
//!
//! - the [`Race`](race::Race) aggregate: builds the live field snapshot, runs
//!   the contention coordinator passes, and **produces `FieldInputs` from the
//!   real field**, then calls the shared pure step in `uma-sim-primitives`;
//! - the [`run_race_sim`](simulation::run_race_sim) use case + distribution
//!   orchestration over many randomized rounds;
//! - the read-model collectors (`RaceSimDataCollector`, `RaceEventLogCollector`).
//!
//! It contains **no paradigm flag** — there is no `Compare`/vacuum branch here;
//! the vacuum bench lives in `uma-sim-vacuum`. Both engines run the same step
//! kernel and differ only in how they produce `FieldInputs`.

pub mod collectors;
pub mod race;
pub mod simulation;

pub use race::{Race, SimulationSettings};
pub use simulation::{
    run_race_sim, FinishEntry, RaceSimParams, RaceSimResult, SimError, FIELD_SIZE,
};
