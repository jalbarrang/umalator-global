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
//! - [`skills`] — the skill model + effects, the condition *language* (parser +
//!   static catalog + dynamic predicate registry), activation sampling, and
//!   debuff/recovery resolution. Reads live race state only through the
//!   read-only view traits it defines, never by depending on an engine.
//!
//! - [`projection`] — pure read-model helpers that reconcile per-tick active
//!   effect snapshots into `[start, end]` activation logs.
//!
//! The dependency direction is strictly inward: `skills` may use `course` and
//! `shared_kernel`; `course` may use `shared_kernel`; never the reverse, and
//! none references any engine context.

pub mod shared_kernel;

pub mod course;
pub mod skills;

pub mod projection;
