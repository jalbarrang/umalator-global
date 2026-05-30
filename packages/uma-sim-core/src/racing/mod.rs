//! # Racing bounded context (the simulation core)
//!
//! Home of the `Race` **aggregate root**, the `Runner` **entity**, and the
//! domain services that operate over them: position keeping, pacing, and the
//! lifecycle domain events.

pub mod events;
pub mod pacing;
pub mod position_keep;
pub mod race;
pub mod runner;
