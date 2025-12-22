# 002-ADR: Simulation Engine

**Date:** 2025-12-21
**Status:** Proposed
**Author:** [Your Name]

---

## Context

The proposal of this ADR is to create a new simulation engine that takes over the responsibility of the current `RaceSolver` class in a way that mimics a game engine logic and behavior of the races found in the game.

### Layer 1: Engine (Game-Agnostic)

**`Behavior`** - Minimal base class, knows nothing about racing:

```
Behavior
├── onAttach(owner)      // Called when added to an entity
├── onDetach()           // Called when removed
├── onUpdate(dt)         // Per-tick logic
├── priority: number     // Execution order
├── enabled: boolean     // Can be toggled
```

**`Entity`** - Generic container (your Runner extends this):

- Holds a list of behaviors
- Calls lifecycle hooks in priority order
- Has access to a shared `context` reference

**`Simulator`** - Main loop:

- Owns global state (time, phase, course)
- Owns the `EventBus`
- Iterates entities, updates behaviors
- Emits engine-level events (`'tick'`, `'phaseChanged'`, `'raceStart'`, `'raceEnd'`)

---

### Layer 2: Race Domain (Game-Specific)

**`Runner extends Entity`**:

- Holds `RunnerState` (position, speed, lane, HP, etc.)
- Attaches domain-specific behaviors

**Domain Behaviors** subscribe to events they care about:

| Behavior               | Listens To                           | Emits                              |
| ---------------------- | ------------------------------------ | ---------------------------------- |
| `MovementBehavior`     | —                                    | —                                  |
| `StaminaBehavior`      | `'skillRecovery'`                    | `'hpDepleted'`                     |
| `PositionKeepBehavior` | `'phaseChanged'`                     | —                                  |
| `SkillBehavior`        | `'debuffReceived'`, `'phaseChanged'` | `'skillActivated'`, `'skillEnded'` |
| `RushedBehavior`       | `'debuffReceived'`                   | `'rushedStarted'`, `'rushedEnded'` |
| `CompetitionBehavior`  | `'phaseChanged'`                     | —                                  |

---

### Per-Runner Skill Management

Each `Runner` has a **`SkillBehavior`** instance that:

1. **Owns pending skills** - skills waiting for activation conditions
2. **Owns active skills** - currently running with duration timers
3. **Checks conditions** each tick against its runner's state
4. **Applies effects** (speed modifiers, HP recovery, etc.) to its own runner
5. **Receives debuffs** from other runners' skill activations via events

For multi-runner races, the flow would be:

```
Runner A's SkillBehavior activates a debuff skill
  → emits 'debuffApplied' with target info
  → Simulator routes event to Runner B
  → Runner B's SkillBehavior receives it, applies effect
```

---

### Event Routing for Multi-Runner

**Scoped Event Bus per Runner + Global Bus**

- Each Runner has a local bus for internal behavior communication
- Simulator has a global bus for cross-runner events
- `SkillBehavior` publishes debuffs to global bus with target filter

---

## Revised Three-Layer Architecture

### Layer 0: Engine Core

**`GameEngine`** - The true main loop, completely game-agnostic:

```
GameEngine
├── entities: Entity[]
├── eventBus: EventBus
├── time: number
├── addEntity(entity)
├── removeEntity(entity)
├── tick(dt)              // Iterates all entities, calls behavior updates
├── run(duration, dt)     // Main simulation loop
```

**`Entity`** - Container for behaviors:

```
Entity
├── behaviors: Behavior[]
├── context: unknown      // Injected by subclass
├── addBehavior(behavior)
├── removeBehavior(behavior)
├── update(dt)            // Calls all behaviors in priority order
```

**`Behavior`** - Minimal base:

```
Behavior
├── owner: Entity
├── priority: number
├── enabled: boolean
├── onAttach(owner)
├── onDetach()
├── onUpdate(dt)
```

**`EventBus`** - Generic pub/sub (no domain types)

---

### Layer 1: Racing Domain

**`RaceSimulator extends Entity`** - The race orchestrator:

```
RaceSimulator
├── course: CourseData
├── runners: Runner[]
├── phase: IPhase
├── raceTime: number
├── behaviors:
│   ├── PhaseTransitionBehavior   // Tracks distance, emits 'phaseChanged'
│   ├── PacemakerBehavior         // Selects/updates pacemaker
│   └── RaceEndBehavior           // Detects finish, ends race
```

**`Runner extends Entity`** - Each horse:

```
Runner
├── state: RunnerState
├── behaviors:
│   ├── MovementBehavior
│   ├── StaminaBehavior
│   ├── SkillBehavior
│   ├── PositionKeepBehavior
│   ├── RushedBehavior
│   └── ...
```

---

### Hierarchy Diagram

```
GameEngine (engine/)
│
├── RaceSimulator : Entity (racing/)
│   ├── PhaseTransitionBehavior
│   ├── PacemakerBehavior
│   └── RaceEndBehavior
│
├── Runner : Entity (racing/)
│   ├── MovementBehavior
│   ├── SkillBehavior
│   └── ...
│
├── Runner : Entity
│   └── ...
│
└── (more runners...)
```

---

### Tick Flow

```
GameEngine.tick(dt)
  ├── RaceSimulator.update(dt)
  │     ├── PhaseTransitionBehavior checks position → emits 'phaseChanged'
  │     ├── PacemakerBehavior updates pacemaker reference
  │     └── ...
  │
  ├── Runner[0].update(dt)
  │     ├── SkillBehavior checks conditions, activates skills
  │     ├── MovementBehavior updates speed/position
  │     └── ...
  │
  ├── Runner[1].update(dt)
  │     └── ...
  └── ...
```

---

### Folder Structure

```
engine/
├── GameEngine.ts         // Main loop, entity iteration
├── Entity.ts             // Behavior container base
├── Behavior.ts           // Minimal lifecycle base
├── EventBus.ts           // Generic pub/sub
└── types.ts

racing/
├── RaceSimulator.ts      // extends Entity, race orchestrator
├── Runner.ts             // extends Entity, per-horse
├── RunnerState.ts
├── RaceContext.ts        // Shared read-only state for behaviors
├── behaviors/
│   ├── simulator/
│   │   ├── PhaseTransitionBehavior.ts
│   │   ├── PacemakerBehavior.ts
│   │   └── RaceEndBehavior.ts
│   └── runner/
│       ├── MovementBehavior.ts
│       ├── SkillBehavior.ts
│       └── ...
└── events/
    └── RaceEvents.ts
```

---

### Why This Works

1. **`GameEngine`** is reusable—could run any tick-based simulation
2. **`RaceSimulator`** is just another entity with behaviors that manage global race state
3. **Runners** are peers of `RaceSimulator` in the engine—same update mechanism
4. **Event-driven coupling**: `RaceSimulator` emits `'phaseChanged'`, runners subscribe—no hard dependencies

---

### Key Principle

**Engine layer**: Knows about entities, behaviors, ticks, events.
**Racing layer**: Knows about phases, skills, HP, strategies.

The `Behavior` base class never imports anything from `racing/`. This keeps OCP intact—you can add new racing behaviors without touching the engine.
