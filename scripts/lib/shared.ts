/**
 * Shared utilities for data extraction scripts
 */

import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import nodePath from 'node:path';

/**
 * Sort an object by numeric keys
 * Ensures JSON output has keys in ascending numerical order
 */
export function sortByNumericKey<T>(obj: Record<string, T>): Record<string, T> {
  return Object.keys(obj)
    .sort((a, b) => parseInt(a) - parseInt(b))
    .reduce(
      (acc, key) => {
        acc[key] = obj[key];
        return acc;
      },
      {} as Record<string, T>,
    );
}

/**
 * Calculate unique skill ID from outfit ID
 * Keep this helper local so CLI extraction stays Node-only.
 */
export function getUniqueSkillForOutfit(outfitId: string): string {
  const umaId = +outfitId.slice(1, -2);
  const altId = +outfitId.slice(-2);
  return (100000 + 10000 * (altId - 1) + umaId * 10 + 1).toString();
}

/**
 * Commander sometimes receives an extra standalone `--` from package-manager arg passthrough.
 * Strip that separator so scripts work with both `pnpm run foo -- --flag` and direct execution.
 */
export function normalizeCommanderArgv(argv: Array<string>): Array<string> {
  const passthroughSeparatorIndex = argv.findIndex((value, index) => index >= 2 && value === '--');
  if (passthroughSeparatorIndex === -1) {
    return argv;
  }

  return [
    ...argv.slice(0, passthroughSeparatorIndex),
    ...argv.slice(passthroughSeparatorIndex + 1),
  ];
}

/**
 * Write JSON data to file with minified format and trailing newline
 * Matches the canonical format used by Perl scripts (sorted keys, no pretty-print)
 */
export async function writeJsonFile(
  filePath: string,
  data: Record<string, unknown>,
): Promise<void> {
  const output = JSON.stringify(data) + '\n';
  await mkdir(nodePath.dirname(filePath), { recursive: true });
  await writeFile(filePath, output, 'utf8');
}

/**
 * Read and parse a JSON file
 */
export async function readJsonFile<T>(path: string): Promise<T> {
  const content = await readFile(path, 'utf8');
  return JSON.parse(content) as T;
}

/**
 * Read and parse a JSON file if present
 */
export async function readJsonFileIfExists<T>(path: string): Promise<T | null> {
  try {
    return await readJsonFile<T>(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

/**
 * Get default master.mdb path based on platform
 */
export function getDefaultMasterDbPath(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    // Windows path
    const appData = process.env.APPDATA || process.env.LOCALAPPDATA || process.env.USERPROFILE;
    if (!appData) {
      throw new Error('Could not determine AppData path on Windows');
    }
    // Navigate to LocalLow\Cygames\Umamusume\master\master.mdb
    return `${appData}\\..\\LocalLow\\Cygames\\Umamusume\\master\\master.mdb`;
  } else if (platform === 'darwin' || platform === 'linux') {
    // macOS/Linux - look for Steam/Proton installation
    const home = process.env.HOME;
    if (!home) {
      throw new Error('Could not determine HOME path');
    }
    // Try common Steam paths
    return `${home}/.local/share/Steam/steamapps/compatdata/*/pfx/drive_c/users/steamuser/AppData/LocalLow/Cygames/Umamusume/master/master.mdb`;
  }

  throw new Error(`Unsupported platform: ${platform}`);
}

/**
 * Resolve master.mdb path from explicit input, local db/, or default
 */
export async function resolveMasterDbPath(cliDbPath?: string): Promise<string> {
  // Prefer explicit caller-provided path.
  if (cliDbPath) {
    return cliDbPath;
  }

  // Check for local db/master.mdb in current workspace
  const localPath = nodePath.join(process.cwd(), 'db/master.mdb');
  try {
    await access(localPath);
    return localPath;
  } catch {
    // Fall through to platform-specific default path.
  }

  // Fall back to platform-specific default
  return getDefaultMasterDbPath();
}
