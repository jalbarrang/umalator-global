import type {
  CourseData,
  IDistanceType,
  IOrientation,
  IPhase,
  ISurface,
} from '@/modules/simulation/lib/course/definitions';
import {
  distances,
  orientations,
  phases,
  surfaces,
} from '@/modules/simulation/lib/course/definitions';
import { getCourseById } from '@/modules/racetrack/courses';

export class CourseHelpers {
  static assertIsPhase(phase: number): asserts phase is IPhase {
    if (!phases.includes(phase as IPhase)) {
      throw new Error(`Phase ${phase} is not a valid Phase`);
    }
  }

  static assertIsSurface(surface: number): asserts surface is ISurface {
    if (!surfaces.includes(surface as ISurface)) {
      throw new Error(`Surface ${surface} is not a valid Surface`);
    }
  }

  static assertIsDistanceType(distanceType: number): asserts distanceType is IDistanceType {
    if (!distances.includes(distanceType as IDistanceType)) {
      throw new Error(`DistanceType ${distanceType} is not a valid DistanceType`);
    }
  }

  static assertIsOrientation(orientation: number): asserts orientation is IOrientation {
    if (!orientations.includes(orientation as IOrientation)) {
      throw new Error(`Orientation ${orientation} is not a valid Orientation`);
    }
  }

  static isSortedByStart(arr: ReadonlyArray<{ readonly start: number }>) {
    // typescript seems to have some trouble inferring tuple types, presumably because it doesn't really
    // sufficiently distinguish tuples from arrays
    // so dance around a little bit to make it work
    const init: [boolean, number] = [true, -1];

    function isSorted(a: [boolean, number], b: { start: number }): [boolean, number] {
      return [a[0] && b.start > a[1], b.start];
    }

    return arr.reduce(isSorted, init)[0];
  }

  static phaseStart(distance: number, phase: IPhase) {
    switch (phase) {
      case 0:
        return 0;
      case 1:
        return (distance * 1) / 6;
      case 2:
        return (distance * 2) / 3;
      case 3:
        return (distance * 5) / 6;
      default:
        throw new Error(`Invalid phase: ${phase}`);
    }
  }

  static phaseEnd(distance: number, phase: IPhase) {
    switch (phase) {
      case 0:
        return (distance * 1) / 6;
      case 1:
        return (distance * 2) / 3;
      case 2:
        return (distance * 5) / 6;
      case 3:
        return distance;
      default:
        throw new Error(`Invalid phase: ${phase}`);
    }
  }

  static courseSpeedModifier(
    course: CourseData,
    stats: Readonly<{
      speed: number;
      stamina: number;
      power: number;
      guts: number;
      wisdom: number;
    }>,
  ) {
    const statvalues = [0, stats.speed, stats.stamina, stats.power, stats.guts, stats.wisdom].map(
      (x) => Math.min(x, 901),
    );

    return (
      1 +
      course.courseSetStatus
        .map((stat) => (1 + Math.floor(statvalues[stat] / 300.01)) * 0.05)
        .reduce((a, b) => a + b, 0) /
        Math.max(course.courseSetStatus.length, 1)
    );
  }

  static getCourse(courseId: number): CourseData {
    const course = getCourseById(courseId);

    let slopes = course.slopes;
    if (!this.isSortedByStart(slopes)) {
      slopes = slopes.toSorted((a, b) => a.start - b.start);
    }

    const courseWidth = 11.25;
    const horseLane = courseWidth / 18.0;
    const laneChangeAcceleration = 0.02 * 1.5;
    const laneChangeAccelerationPerFrame = laneChangeAcceleration / 15.0;
    const maxLaneDistance = (courseWidth * course.laneMax) / 10000.0;
    const moveLanePoint = course.corners.length > 0 ? course.corners[0].start : 30.0;

    const course2: CourseData = {
      ...course,
      courseWidth,
      horseLane,
      laneChangeAcceleration,
      laneChangeAccelerationPerFrame,
      maxLaneDistance,
      moveLanePoint,
    };

    return course2;
  }
}
