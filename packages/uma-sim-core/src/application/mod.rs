//! # Application layer
//!
//! Orchestration use cases and **read-model projections** over the domain-event
//! stream. This layer wires the bounded contexts together; it holds no domain
//! rules of its own.

pub mod collectors;
pub mod mob;
pub mod simulation;
