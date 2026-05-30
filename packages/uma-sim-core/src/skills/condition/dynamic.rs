//! Runtime (dynamic) condition predicate + the live-race view trait it observes.
//!
//! In the TypeScript engine a dynamic condition is `(runner: Runner) => boolean`
//! evaluated each tick. Here it is a boxed closure over the [`RunnerView`] trait,
//! which is the anti-corruption seam: the skills context observes live race state
//! without depending on the `racing` module. `RunnerView` is intentionally empty
//! for now and is fleshed out by the full-sim condition work (t-009).

use std::fmt;
use std::sync::Arc;

/// Read-only view of a live runner that dynamic conditions evaluate against.
///
/// Implemented by the `racing` context's `Runner` (t-013+). Expanded with the
/// accessor methods dynamic conditions need in t-009.
pub trait RunnerView {}

/// A runtime predicate gating a skill's activation, evaluated each tick.
///
/// Cloning is cheap (shared `Arc`). There is deliberately no `PartialEq`: closure
/// identity is not meaningful. The "no extra condition" case is modeled as
/// `Option::<DynamicCondition>::None` rather than a sentinel value (see
/// [`ConditionResult`](super::ConditionResult)).
#[derive(Clone)]
pub struct DynamicCondition(Arc<DynCondFn>);

/// The boxed predicate type behind a [`DynamicCondition`].
type DynCondFn = dyn Fn(&dyn RunnerView) -> bool + Send + Sync;

impl DynamicCondition {
    /// Wrap a predicate closure.
    pub fn new(f: impl Fn(&dyn RunnerView) -> bool + Send + Sync + 'static) -> Self {
        DynamicCondition(Arc::new(f))
    }

    /// The trivial always-true condition (`kTrue`). Prefer representing "no
    /// condition" as `None`; this materializes it when a concrete value is
    /// required.
    pub fn k_true() -> Self {
        DynamicCondition::new(|_| true)
    }

    /// Evaluate the predicate against a live runner view.
    pub fn eval(&self, runner: &dyn RunnerView) -> bool {
        (self.0)(runner)
    }
}

impl fmt::Debug for DynamicCondition {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("DynamicCondition(..)")
    }
}

/// Evaluate an optional dynamic condition; `None` means always-true (`kTrue`).
pub fn eval_dynamic(cond: &Option<DynamicCondition>, runner: &dyn RunnerView) -> bool {
    cond.as_ref().is_none_or(|c| c.eval(runner))
}
