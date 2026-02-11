import type {
  CourseData,
  IGrade,
  IGroundCondition,
  ISeason,
  ITimeOfDay,
  IWeather,
} from '../course/definitions';
import type { Runner } from './runner';

export type RaceParameters = {
  ground: IGroundCondition;
  weather: IWeather;
  season: ISeason;
  timeOfDay: ITimeOfDay;
  grade: IGrade;
};

export type RaceSimulatorProps = {
  /**
   * The parameters for the race simulation
   */
  parameters: RaceParameters;
  /**
   * The course data for the race
   */
  course: CourseData;
};

export abstract class Race {
  public course: CourseData;
  public ground: IGroundCondition;
  public weather: IWeather;
  public season: ISeason;
  public timeOfDay: ITimeOfDay;
  public grade: IGrade;

  public runners: Map<number, Runner>;

  constructor(props: RaceSimulatorProps) {
    this.course = props.course;

    this.ground = props.parameters.ground;
    this.weather = props.parameters.weather;
    this.season = props.parameters.season;
    this.timeOfDay = props.parameters.timeOfDay;
    this.grade = props.parameters.grade;

    this.runners = new Map();
  }

  public onInitialize(): void {}
  public onPrepare(): void {}

  // ===================
  // Race Loop
  // ===================

  public onStart(): void {
    const runners = new Map(this.runners);

    while (runners.size > 0) {
      this.onUpdate(1 / 15, runners);
    }
  }

  public onUpdate(dt: number, runners: Map<number, Runner>): void {
    for (const runner of runners.values()) {
      runner.onUpdate(dt);

      if (runner.finished) {
        runners.delete(runner.id);
      }
    }
  }

  // ===================
  // Getters
  // ===================

  public get baseSpeed(): number {
    return 20.0 - (this.course.distance - 2000) / 1000.0;
  }
}
