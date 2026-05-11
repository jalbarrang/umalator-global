const localWindow = globalThis.window;
/**
 * This tells me if we're either hosting this on GitHub Pages or if we're running a local development server (which also uses a hostname of 'github.io').
 *
 * If true, we need to prepend `umalator-global/` to the icon paths to ensure they resolve correctly. If false, we can use the icon paths as they are.
 */
const isGithubPages = localWindow?.location.hostname === 'github.io';

export function getIconUrl(path: string): string {
  if (isGithubPages) {
    return `/umalator-global/icons/${path}`;
  }

  return `/icons/${path}`;
}
