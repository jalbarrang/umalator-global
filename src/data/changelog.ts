import changelogRaw from '../../CHANGELOG.md?raw';

export type ChangelogEntry = {
  version: string;
  date: string;
  changes: Array<string>;
};

export function parseChangelog(markdown: string): Array<ChangelogEntry> {
  const entries: Array<ChangelogEntry> = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');

  let currentEntry: ChangelogEntry | null = null;

  for (const line of lines) {
    // Match conventional-changelog format: ## [0.6.0](url) (2026-05-13)
    const conventionalMatch = line.match(/^##\s+\[([^\]]+)\]\([^)]*\)\s+\((\d{4}-\d{2}-\d{2})\)/);
    // Match manual format: ## 0.5.0 - 2026-04-06
    const manualMatch = line.match(/^##\s+([^\s]+)\s+[-\u2013\u2014]\s+(\d{4}-\d{2}-\d{2})\s*$/);

    const versionMatch = conventionalMatch ?? manualMatch;
    if (versionMatch) {
      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[2],
        changes: []
      };
      entries.push(currentEntry);
      continue;
    }

    // Skip section headers like ### Features, ### Bug Fixes
    if (line.match(/^###\s+/)) continue;

    // Match both `- item` and `* item` bullets
    const itemMatch = line.match(/^[-*]\s+(.+)$/);
    if (!itemMatch || !currentEntry) continue;

    currentEntry.changes.push(itemMatch[1].trim());
  }

  return entries;
}

export const changelog = parseChangelog(changelogRaw);
