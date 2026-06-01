//! # Application layer
//!
//! Orchestration use cases and **read-model projections** over the domain-event
//! stream. This layer wires the bounded contexts together; it holds no domain
//! rules of its own.

pub mod collectors;
pub mod simulation;

// Mob (NPC) field generation moved to `uma-sim-primitives` (ADR-0005,
// field-agnostic shared support). Re-exported so `crate::application::mob::…`
// paths keep resolving.
pub use uma_sim_primitives::mob;
