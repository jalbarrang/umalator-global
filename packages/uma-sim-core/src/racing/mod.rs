//! # Racing bounded context (the simulation core)
//!
//! Home of the `Race` **aggregate root**, the `Runner` **entity**, and the
//! domain services that operate over them: position keeping, pacing, and the
//! lifecycle domain events.

pub mod events;
pub mod pacing;
pub mod race;

// The `Runner` entity + pure step kernel and the virtual position-keep state
// machine were extracted into `uma-sim-primitives` (ADR-0005 step 2). Re-exported
// here so `crate::racing::runner::…` / `crate::racing::position_keep::…` paths
// (and the producer/aggregate in `race.rs`) keep resolving unchanged.
pub use uma_sim_primitives::{position_keep, runner};
