export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const secondsStr = remainingSeconds.toFixed(3).padStart(6, '0');
  return `${minutes}:${secondsStr}`;
}
