import { Race } from '../../common/race';
import type { RaceSimulatorProps } from '../../common/race';

export type CompareRaceSimulatorProps = RaceSimulatorProps & {
  duelingRates: DuelingRates;
};

export type DuelingRates = {
  runaway: number;
  frontRunner: number;
  paceChaser: number;
  lateSurger: number;
  endCloser: number;
};

/**
 * # Race Simulator
 *
 * ## Overview
 *
 * The core class for running a race simulation.
 */
export class CompareRace extends Race {
  // ==================
  // Race Stats
  // ==================

  public duelingRates: DuelingRates | null;

  constructor(props: CompareRaceSimulatorProps) {
    super(props);

    this.duelingRates = props.duelingRates;
  }
}
