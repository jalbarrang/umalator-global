//! Read-model **projections** over the domain-event stream.
//!
//! Collectors implement the [`RaceObserver`] port (t-012) and accumulate
//! telemetry as the aggregate emits lifecycle events. They are projections, not
//! domain logic — they live in the application layer and never mutate the race.
//!
//! [`RaceSimDataCollector`] captures per-round, per-tick traces for a set of
//! *focus* runners (used to drive charts / replays in the UI). The richer
//! state-diff event-log projection (`race-event-log.ts`) is a larger port and is
//! tracked as follow-up work.

use std::cell::RefCell;
use std::rc::Rc;

use crate::racing::events::{RaceObservation, RaceObserver, RunnerObservation};
use crate::shared_kernel::ids::RunnerId;

/// One per-tick sample of a focused runner.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TickSample {
    /// Elapsed race time in seconds.
    pub time: f64,
    /// Longitudinal position in meters.
    pub position: f64,
    /// Current speed in m/s.
    pub speed: f64,
    /// Lateral lane offset.
    pub lane: f64,
    /// Remaining absolute HP.
    pub health: f64,
}

/// The per-round trace for one focused runner.
#[derive(Debug, Clone, PartialEq)]
pub struct FocusTrace {
    /// The focused runner.
    pub runner_id: RunnerId,
    /// Per-tick samples in chronological order.
    pub samples: Vec<TickSample>,
}

/// One round's collected focus traces.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct RoundData {
    /// Master seed of the round.
    pub seed: u64,
    /// One trace per focused runner.
    pub focus: Vec<FocusTrace>,
}

/// The accumulated result of a [`RaceSimDataCollector`].
#[derive(Debug, Clone, Default, PartialEq)]
pub struct CollectedData {
    /// One entry per simulated round.
    pub rounds: Vec<RoundData>,
}

#[derive(Default)]
struct CollectorInner {
    focus_ids: Vec<RunnerId>,
    data: CollectedData,
}

/// Collects per-tick traces for a set of focus runners across rounds.
///
/// Construct it, attach [`handle`](Self::handle) as a [`RaceObserver`] on the
/// race, run the simulation, then read [`result`](Self::result).
pub struct RaceSimDataCollector {
    inner: Rc<RefCell<CollectorInner>>,
}

impl RaceSimDataCollector {
    /// A collector tracing the given focus runners (empty = trace none).
    pub fn new(focus_ids: Vec<RunnerId>) -> Self {
        RaceSimDataCollector {
            inner: Rc::new(RefCell::new(CollectorInner {
                focus_ids,
                data: CollectedData::default(),
            })),
        }
    }

    /// A boxed observer sharing this collector's storage (subscribe it on the
    /// race).
    pub fn handle(&self) -> Box<dyn RaceObserver> {
        Box::new(CollectorObserver {
            inner: Rc::clone(&self.inner),
        })
    }

    /// Snapshot of the data collected so far.
    pub fn result(&self) -> CollectedData {
        self.inner.borrow().data.clone()
    }
}

struct CollectorObserver {
    inner: Rc<RefCell<CollectorInner>>,
}

impl RaceObserver for CollectorObserver {
    fn on_round_start(&mut self, race: &dyn RaceObservation, seed: u64) {
        let mut inner = self.inner.borrow_mut();
        let focus = inner
            .focus_ids
            .iter()
            .map(|&runner_id| FocusTrace {
                runner_id,
                samples: Vec::new(),
            })
            .collect();
        let _ = race;
        inner.data.rounds.push(RoundData { seed, focus });
    }

    fn on_after_runner_tick(
        &mut self,
        _race: &dyn RaceObservation,
        runner: &dyn RunnerObservation,
        _dt: f64,
    ) {
        let mut inner = self.inner.borrow_mut();
        if !inner.focus_ids.contains(&runner.id()) {
            return;
        }
        let sample = TickSample {
            time: runner.accumulate_time(),
            position: runner.position(),
            speed: runner.current_speed(),
            lane: runner.current_lane(),
            health: runner.current_health(),
        };
        if let Some(round) = inner.data.rounds.last_mut() {
            if let Some(trace) = round.focus.iter_mut().find(|t| t.runner_id == runner.id()) {
                trace.samples.push(sample);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    struct DummyRace;
    impl RaceObservation for DummyRace {}

    struct DummyRunner {
        id: u32,
        pos: f64,
    }
    impl RunnerObservation for DummyRunner {
        fn id(&self) -> RunnerId {
            RunnerId(self.id)
        }
        fn position(&self) -> f64 {
            self.pos
        }
    }

    #[test]
    fn collects_focus_runner_samples_only() {
        let collector = RaceSimDataCollector::new(vec![RunnerId(1)]);
        let mut obs = collector.handle();
        obs.on_round_start(&DummyRace, 42);
        obs.on_after_runner_tick(&DummyRace, &DummyRunner { id: 0, pos: 10.0 }, 0.0625);
        obs.on_after_runner_tick(&DummyRace, &DummyRunner { id: 1, pos: 20.0 }, 0.0625);
        obs.on_after_runner_tick(&DummyRace, &DummyRunner { id: 1, pos: 30.0 }, 0.0625);

        let data = collector.result();
        assert_eq!(data.rounds.len(), 1);
        assert_eq!(data.rounds[0].seed, 42);
        assert_eq!(data.rounds[0].focus.len(), 1);
        assert_eq!(data.rounds[0].focus[0].runner_id, RunnerId(1));
        assert_eq!(data.rounds[0].focus[0].samples.len(), 2);
        assert_eq!(data.rounds[0].focus[0].samples[1].position, 30.0);
    }
}
