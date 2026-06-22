import { config } from '@/config';
import type { TimelinePayload } from './timeline-types';

class TimelineWorkerUrlMissingError extends Error {
  constructor() {
    super('VITE_TIMELINE_WORKER_URL is not configured. Set it to the timeline Worker origin.');
    this.name = 'TimelineWorkerUrlMissingError';
  }
}

let timelinePromise: Promise<TimelinePayload> | null = null;

export async function fetchTimeline(): Promise<TimelinePayload> {
  if (timelinePromise) return timelinePromise;

  const workerUrl = config.timeline.workerUrl;
  if (!workerUrl) {
    throw new TimelineWorkerUrlMissingError();
  }

  const timelineUrl = new URL('/timeline', workerUrl).toString();

  timelinePromise = fetch(timelineUrl).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load timeline: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as TimelinePayload;
  });

  return timelinePromise;
}
