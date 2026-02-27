import changelogRaw from '../../CHANGELOG.md?raw';

export type ChangelogEntry = {
  version: string;
  date: string;
  changes: Array<string>;
};

export function parseChangelog(markdown: string): Array<ChangelogEntry> {
  const entries: Array<ChangelogEntry> = [];
  const lines = markdown.split('\n');

  let currentEntry: ChangelogEntry | null = null;

  for (const line of lines) {
    const versionMatch = line.match(/^##\s+([^\s]+)\s+[-\u2013\u2014]\s+(\d{4}-\d{2}-\d{2})\s*$/);
    if (versionMatch) {
      currentEntry = {
        version: versionMatch[1],
        date: versionMatch[2],
        changes: [],
      };
      entries.push(currentEntry);
      continue;
    }

    const itemMatch = line.match(/^\-\s+(.+)$/);
    if (!itemMatch || !currentEntry) continue;

    currentEntry.changes.push(itemMatch[1].trim());
  }

  return entries;
}

export const changelog = parseChangelog(changelogRaw);
