import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration'; // ES 2015
import relativeTime from 'dayjs/plugin/relativeTime'; // ES 2015

dayjs.extend(duration);
dayjs.extend(relativeTime);

export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const secondsStr = remainingSeconds.toFixed(3).padStart(6, '0');
  return `${minutes}:${secondsStr}`;
}

export const formatMs = (ms: number): number => {
  return dayjs.duration(ms).asSeconds();
};

export { dayjs };
