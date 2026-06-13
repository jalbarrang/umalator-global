// Single source of truth for the runtime-fetched data datasets.
//
// These JSON files used to be statically imported (and thus inlined into the JS
// bundle). They are now emitted as content-hashed assets under `public/data/`
// by the `data-manifest` Vite plugin and fetched at runtime via the manifest
// (see `data-manifest.ts` + `bootstrap.ts`). Keep this dependency-free: it is
// imported by `vite.config.ts` (Node) as well as app + test code.

export type DatasetKey =
  | 'skills'
  | 'gametora/skills'
  | 'support-cards'
  | 'gametora/support-cards'
  | 'umas'
  | 'gametora/character-cards'
  | 'gametora/event-skill-sources'
  | 'course_data';

export type DatasetDef = {
  /** Logical key used at runtime to resolve the hashed file from the manifest. */
  key: DatasetKey;
  /** Path relative to `src/modules/data/json/`. */
  source: string;
  /** Hashed output basename (no extension/hash); flattened (no subdirs). */
  outName: string;
};

export const DATASETS: Array<DatasetDef> = [
  { key: 'skills', source: 'skills.json', outName: 'skills' },
  { key: 'gametora/skills', source: 'gametora/skills.json', outName: 'gametora-skills' },
  { key: 'support-cards', source: 'support-cards.json', outName: 'support-cards' },
  {
    key: 'gametora/support-cards',
    source: 'gametora/support-cards.json',
    outName: 'gametora-support-cards'
  },
  { key: 'umas', source: 'umas.json', outName: 'umas' },
  {
    key: 'gametora/character-cards',
    source: 'gametora/character-cards.json',
    outName: 'gametora-character-cards'
  },
  {
    key: 'gametora/event-skill-sources',
    source: 'gametora/event-skill-sources.json',
    outName: 'gametora-event-skill-sources'
  },
  { key: 'course_data', source: 'course_data.json', outName: 'course_data' }
];

/** Directory (under `public/` and the served base path) holding generated data. */
export const DATA_DIR = 'data';
/** Manifest filename at the stable path `${basePath}${DATA_DIR}/${MANIFEST_FILE}`. */
export const MANIFEST_FILE = 'manifest.json';

/** Manifest shape: logical dataset key -> content-hashed filename. */
export type DataManifest = Record<DatasetKey, string>;
