/**
 * Shared utilities for data extraction scripts
 */

import path from 'path';
import { getUniqueSkillForByUmaId as getUniqueSkillForByUmaIdFromUtils } from '@skills/utils';

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
 * Re-export from skills/utils for convenience
 */
export const getUniqueSkillForOutfit = getUniqueSkillForByUmaIdFromUtils;

/**
 * Write JSON data to file with minified format and trailing newline
 * Matches the canonical format used by Perl scripts (sorted keys, no pretty-print)
 */
export async function writeJsonFile(
  path: string,
  data: Record<string, any>,
): Promise<void> {
  const output = JSON.stringify(data) + '\n';
  await Bun.write(path, output);
}

/**
 * Get default master.mdb path based on platform
 */
export function getDefaultMasterDbPath(): string {
  const platform = process.platform;

  if (platform === 'win32') {
    // Windows path
    const appData =
      process.env.APPDATA || process.env.LOCALAPPDATA || process.env.USERPROFILE;
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
 * Resolve master.mdb path from CLI args, local db/, or default
 */
export async function resolveMasterDbPath(): Promise<string> {
  // Check for command-line argument first
  if (process.argv[2]) {
    return process.argv[2];
  }

  // Check for local db/master.mdb using Bun's native API
  const localPath = path.join(process.cwd(), 'db/master.mdb');
  const localFile = Bun.file(localPath);
  if (await localFile.exists()) {
    return localPath;
  }

  // Fall back to platform-specific default
  return getDefaultMasterDbPath();
}

