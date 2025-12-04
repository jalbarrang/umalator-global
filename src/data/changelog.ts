export type ChangelogEntry = {
  version: string;
  date: string;
  changes: {
    type: 'added' | 'changed' | 'fixed' | 'removed';
    items: string[];
  }[];
};

/**
 * Changelog entries for the Umalator project.
 * Add new entries at the TOP of this array (newest first).
 *
 * Example entry:
 * {
 *   version: '1.1.0',
 *   date: '2025-02-01',
 *   changes: [
 *     { type: 'added', items: ['New feature X', 'New feature Y'] },
 *     { type: 'changed', items: ['Improved performance of Z'] },
 *     { type: 'fixed', items: ['Bug where A happened'] },
 *     { type: 'removed', items: ['Deprecated feature B'] },
 *   ],
 * },
 */
export const changelog: ChangelogEntry[] = [
  {
    version: '0.1.0',
    date: '2025-12-04',
    changes: [
      {
        type: 'added',
        items: [
          'Initial release of Umalator Global',
          'Created new UI design for easier use',
          'Added post simulation Stamina calculator for both runners',
          'Revamped the skill list into a skill picker modal for quick skill selection',
        ],
      },
    ],
  },
];
