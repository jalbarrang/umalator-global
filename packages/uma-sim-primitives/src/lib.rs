//! # uma-sim-primitives
//!
//! Pure shared primitives for the Uma Musume race simulation (ADR-0005).
//!
//! Every item here is a **pure function of already-resolved inputs** or a plain
//! value object — nothing in this crate asks whether a field exists or owns any
//! simulation orchestration. Both purpose-built engines (`uma-sim-race`,
//! `uma-sim-vacuum`) and the legacy combined engine in `uma-sim-core` build on
//! top of these.
//!
//! ## Contents
//!
//! - [`shared_kernel`] — cross-context primitives: RNG, IDs, [`Region`](shared_kernel::region),
//!   math value objects, the ubiquitous-language enums, and race parameters.
//! - [`course`] — track-geometry value objects, the phase domain service, and the
//!   speed / acceleration / position-keep coefficient tables (the leaf formulas).
//!
//! The dependency direction is strictly inward: `course` may use `shared_kernel`,
//! never the reverse, and neither references any engine context.

pub mod shared_kernel;

pub mod course;
