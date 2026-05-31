//! # uma-sim-core
//!
//! Pure-Rust domain for the Uma Musume race simulator, organized with
//! **Domain-Driven Design**. Modules are bounded contexts, not technical layers.
//!
//! ## Bounded contexts (dependency direction is strictly inward)
//!
//! ```text
//! application -> racing -> {skills, stamina, course} -> shared_kernel
//! ```
//!
//! - [`shared_kernel`] — cross-context primitives: RNG, IDs, [`Region`](shared_kernel::region),
//!   math value objects, and the ubiquitous-language enums.
//! - [`course`] — track geometry value objects, the phase domain service, coefficient tables.
//! - [`skills`] — skill model, the condition *language* (parser + catalog), effects, activation sampling.
//! - [`stamina`] — HP budget policy (strategy object) + last-spurt domain service.
//! - [`racing`] — the `Race` aggregate root, the `Runner` entity, physics, mechanics,
//!   position keeping, pacing, and domain events.
//! - [`application`] — the `run_race_sim` use case + read-model collectors + mob generation.
//!
//! ## Dependency rule
//!
//! A context may only `use` items from contexts *below* it in the chain above.
//! In particular: `skills/`, `stamina/`, and `course/` must NOT reference `racing` or
//! `application`. Where `skills` needs to observe live race state (dynamic/approximate
//! conditions) it does so through read-only view traits defined inside the condition
//! sub-domain, which `racing` implements — never by depending on the `racing` module.

pub mod shared_kernel;

pub mod course;
pub mod skills;
pub mod stamina;

pub mod racing;

pub mod application;

// Primary use case re-exported at the crate root for the WASM adapter / native
// callers.
pub use application::simulation::{
    run_compare, run_race_sim, CompareSimParams, FinishEntry, RaceSimParams, RaceSimResult,
    SimError,
};
