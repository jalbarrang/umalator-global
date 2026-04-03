const iconModules = import.meta.glob('./**/*.png', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

function normalizeIconPath(path: string): string {
  return path
    .replace(/^\/+/, '')
    .replace(/^icons\//, '')
    .replace(/^\.\//, '');
}

export const iconUrlByPath = Object.fromEntries(
  Object.entries(iconModules).map(([path, url]) => [normalizeIconPath(path), url]),
) as Record<string, string>;

export function getIconUrl(path: string): string {
  if (ABSOLUTE_URL_PATTERN.test(path) || path.startsWith('//') || path.startsWith('data:')) {
    return path;
  }

  const normalizedPath = normalizeIconPath(path);
  const url = iconUrlByPath[normalizedPath];

  if (!url) {
    throw new Error(`Icon not found for path: ${path}`);
  }

  return url;
}
