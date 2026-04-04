import geometryJson from './course_geometry.json';

export type CourseGeometryRotation = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type CourseGeometryRecord = {
  courseId: number;
  assetName: string;
  raceTrackId: number;
  distance: number;
  surface: number;
  course: number;
  trackVariant: number;
  variant: number;
  durationSeconds: number;
  sampleCount: number;
  valueX: number[];
  valueY: number[];
  valueZ: number[];
  rotation: CourseGeometryRotation[];
};

const courseGeometry = geometryJson as Record<string, CourseGeometryRecord>;

export function getCourseGeometry(courseId: number): CourseGeometryRecord | null {
  return courseGeometry[String(courseId)] ?? null;
}
