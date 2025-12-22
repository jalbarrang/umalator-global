// TODO: This random generator needs to allow me to seed it with a string
// That way I can use the same seed for the same race, instead of what's being used where
// The seed will be used to generate the random numbers.
// To me, a seed is already a random state that expands to the rest elements in a deterministic way.

/**
 * An example of this is how Balatro does it:
 *
 * In Balatro, a seed is a starting number or string that initializes the game's pseudo-random number generator (PRNG),
 * ensuring the exact same sequence of random events
 * (like shop items, joker orders, card draws) occurs every time you play with that same seed,
 * allowing for repeatable runs or sharing lucky/unlucky scenarios.
 *
 * -----
 *
 * Using this approach, in our race simulation, a seed would be a starting number or string that initializes the game's pseudo-random number generator (PRNG),
 * ensuring the exact same sequence of random events (like skill activations, lane changes, etc.) occurs every time you play with that same seed,
 * allowing us to share the same race results with others who would like to reproduce the same race.
 */

import Prando from 'prando';

export interface PRNG {
  int32: () => number;
  random: () => number;
  uniform: (upper: number) => number;
}

export class SeededRng {
  private prando: Prando;

  constructor(seed: number) {
    this.prando = new Prando(seed);
  }

  int32(): number {
    return Math.floor(this.prando.next() * 0x100000000);
  }

  random(): number {
    return this.prando.next();
  }

  uniform(upper: number): number {
    return this.prando.nextInt(0, upper - 1);
  }
}

export const Rule30CARng = SeededRng;
