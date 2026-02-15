import { Runner } from '../../common/runner';

/**
 * # Runner
 *
 * ## Overview
 *
 * The class for representing a runner in the race that will be simulated.
 *
 */
export class FullSimRunner extends Runner {
  protected override calculatePosKeepEnd(): number {
    throw new Error('Method not implemented.');
  }
}
