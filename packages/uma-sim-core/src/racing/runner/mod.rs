//! # Runner entity
//!
//! The `Runner` is the core **entity** within the `Race` aggregate (identity =
//! `RunnerId`, mutable per-round lifecycle). Its behavior is split across
//! submodules for readability: lifecycle/init, physics, skills, and the game
//! mechanics (rushed/dueling/spot-struggle/downhill/last-spurt).

pub mod lifecycle;
pub mod mechanics;
pub mod physics;
pub mod skills;
