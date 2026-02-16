import { Race } from '../../common/race';
import type { RaceSimulatorProps } from '../../common/race';

export type FullSimRaceSimulatorProps = RaceSimulatorProps;

export class FullSimRace extends Race {
  constructor(props: FullSimRaceSimulatorProps) {
    super(props);
  }
}
