export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function resolvedColor(cssVar: string): string {
  if (typeof document === 'undefined') return '#888';
  const raw = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  if (!raw) return '#888';
  return `hsl(${raw})`;
}
