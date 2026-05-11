import { useQuery } from '@tanstack/react-query';

import { config } from '@/config';

const courseGeometryUrl = `${config.baseUrl}/data/course_geometry.json`;

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

let courseGeometryPromise: Promise<Record<string, CourseGeometryRecord>> | null = null;

async function loadCourseGeometry(): Promise<Record<string, CourseGeometryRecord>> {
  if (courseGeometryPromise) {
    return courseGeometryPromise;
  }

  courseGeometryPromise = fetch(courseGeometryUrl).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load course geometry: ${response.status} ${response.statusText}`);
    }

    const responseBody = await response.json();

    return responseBody as Record<string, CourseGeometryRecord>;
  });

  return courseGeometryPromise;
}

export async function getCourseGeometry(courseId: number): Promise<CourseGeometryRecord | null> {
  const courseGeometry = await loadCourseGeometry();

  return courseGeometry[String(courseId)] ?? null;
}

export const useFetchAllCourseGeometry = () => {
  return useQuery({
    queryKey: ['courseGeometry'],
    queryFn: loadCourseGeometry,
    staleTime: Infinity,
  });
};
