import { getDataRuntime, type SnapshotId } from './runtime';

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

/**
 * Build the fetch URL for a snapshot's course_geometry.json.
 * Geometry stays in public/ and is fetched lazily — it is NOT imported as a module.
 */
export function buildCourseGeometryPath(snapshot: SnapshotId): string {
  return `${import.meta.env.BASE_URL}data/${snapshot}/course_geometry.json`;
}

let courseGeometryPromise: Promise<Record<string, CourseGeometryRecord>> | null = null;
let courseGeometryPath: string | null = null;

async function loadCourseGeometry(): Promise<Record<string, CourseGeometryRecord>> {
  const nextCourseGeometryPath = getDataRuntime().catalog.courseGeometryPath;

  if (!courseGeometryPromise || courseGeometryPath !== nextCourseGeometryPath) {
    courseGeometryPath = nextCourseGeometryPath;
    courseGeometryPromise = fetch(nextCourseGeometryPath).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Failed to load course geometry: ${response.status} ${response.statusText}`,
        );
      }

      return (await response.json()) as Record<string, CourseGeometryRecord>;
    });
  }

  return courseGeometryPromise;
}

export async function getCourseGeometry(courseId: number): Promise<CourseGeometryRecord | null> {
  const courseGeometry = await loadCourseGeometry();
  return courseGeometry[String(courseId)] ?? null;
}
