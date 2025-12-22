# Introduction

## What is Tiny Engine?

Tiny Engine is a minimal, headless game engine designed for tick-based simulations. Think of it as the foundation for building complex, deterministic simulations without the overhead of graphics, input handling, or other game engine features you don't need.

If you're building a racing simulator, physics engine, or running thousands of Monte Carlo simulations, Tiny Engine gives you the structure you need without the bloat you don't.

## Why Tiny Engine?

When building the Uma Musume race simulator, we needed an engine that could:

- **Run headless** - No graphics, pure logic simulation
- **Be deterministic** - Same inputs produce identical outputs every time
- **Scale to Monte Carlo** - Run thousands of simulations efficiently
- **Stay maintainable** - Clear separation of concerns as complexity grows

Traditional game engines are designed for games—they want to render graphics, handle input, and manage assets. We just needed a clean way to organize simulation logic.

## A 30-Second Example

Here's a complete simulation in under 20 lines:

```typescript
import { GameEngine, Entity, Behavior } from '@/lib/tiny-engine';

// Define what happens each tick
class PhysicsBehavior extends Behavior {
  position = 0;
  velocity = 10;

  override onUpdate(dt: number): void {
    this.position += this.velocity * dt;
  }
}

// Set up and run
const engine = new GameEngine();
const entity = new Entity('ball');
entity.addBehavior(new PhysicsBehavior());
engine.addEntity(entity);

engine.run(2.0, 0.016); // Run for 2 seconds at 60fps

// Check result
const physics = entity.getBehavior(PhysicsBehavior);
console.log(physics?.position); // 20.0 (10 units/s * 2s)
```

That's it! You just simulated 2 seconds of motion with frame-perfect precision.

## Key Features

### 🎯 Headless Execution

No graphics, no rendering, no window management. Pure simulation logic. Perfect for:

- Backend simulations
- Data analysis
- Automated testing
- Monte Carlo analysis

### 🔄 Deterministic by Design

Run the same simulation 1000 times, get the same result 1000 times. Critical for:

- Reproducible results
- Debugging
- Seeded randomness
- Regression testing

### 🧩 Composition Over Inheritance

Build complex systems from simple, reusable behaviors:

```typescript
const runner = new Entity('runner-1');
runner.addBehavior(new MovementBehavior());
runner.addBehavior(new StaminaBehavior());
runner.addBehavior(new SkillBehavior());
runner.addBehavior(new AIBehavior());
```

Each behavior focuses on one thing. Need to add new functionality? Add a new behavior. No inheritance chains to navigate.

### 📡 Event-Driven Communication

Behaviors communicate through events, not direct references:

```typescript
class SkillBehavior extends Behavior {
  override onUpdate(): void {
    if (this.skillActivated) {
      this.owner?.engine?.eventBus.emit('skill:activated', {
        runnerId: this.owner.id,
        skillId: this.activeSkill,
      });
    }
  }
}
```

This keeps your code decoupled and testable.

## Who Should Use Tiny Engine?

Tiny Engine is perfect for:

- **Simulation Developers** - Building physics, racing, or economic simulations
- **Monte Carlo Analysis** - Running thousands of deterministic simulations
- **Game Prototyping** - Testing game mechanics without graphics overhead
- **Data Scientists** - Simulating complex systems for analysis

You probably **don't** need Tiny Engine if:

- You need graphics rendering
- You're building a real-time multiplayer game
- You want built-in physics or collision detection
- You need a complete game development framework

## What You'll Build

Throughout this documentation, we'll build a complete racing simulation using Tiny Engine. You'll learn how to:

1. Structure complex simulations with behaviors
2. Handle multi-entity interactions (multiple racers)
3. Implement priority-based execution (physics before AI)
4. Use events for cross-entity communication
5. Maintain determinism for Monte Carlo analysis
6. Test and debug your simulations

By the end, you'll have the knowledge to build your own simulation systems on top of Tiny Engine.

## Next Steps

Ready to dive in? Start with [Core Concepts](02-core-concepts.md) to understand the four pillars of Tiny Engine.

Already familiar with the concepts? Jump to [Your First Simulation](03-your-first-simulation.md) and build something working in 5 minutes.
