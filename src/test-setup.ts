import { beforeEach } from 'vitest';
import skillsJson from '@/modules/data/json/skills.json';
import gametoraSkillsJson from '@/modules/data/json/gametora/skills.json';
import masterSupportCardsJson from '@/modules/data/json/support-cards.json';
import gametoraSupportCardsJson from '@/modules/data/json/gametora/support-cards.json';
import masterUmasJson from '@/modules/data/json/umas.json';
import characterCardsJson from '@/modules/data/json/gametora/character-cards.json';
import eventSkillSourcesJson from '@/modules/data/json/gametora/event-skill-sources.json';
import courseDataJson from '@/modules/data/json/course_data.json';
import { initDataFromRaw, type RawData } from '@/modules/data/bootstrap';

// Tests populate the data services synchronously from the source JSON (bundling
// JSON in the test env is fine — it is never shipped). Mirrors the runtime
// `bootstrapData()` without the network/manifest layer.
initDataFromRaw({
  skills: skillsJson as unknown as RawData['skills'],
  gametoraSkills: gametoraSkillsJson as unknown as RawData['gametoraSkills'],
  masterSupportCards: masterSupportCardsJson as unknown as RawData['masterSupportCards'],
  gametoraSupportCards: gametoraSupportCardsJson as unknown as RawData['gametoraSupportCards'],
  masterUmas: masterUmasJson as unknown as RawData['masterUmas'],
  characterCards: characterCardsJson as unknown as RawData['characterCards'],
  eventSkillSources: eventSkillSourcesJson as unknown as RawData['eventSkillSources'],
  courseData: courseDataJson as unknown as RawData['courseData']
});

function createInMemoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.has(key) ? (data.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...data.keys()][index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    }
  };
}

function hasWorkingStorage(storage: Storage | undefined): storage is Storage {
  return typeof storage?.clear === 'function' && typeof storage?.getItem === 'function';
}

/** Node 24+ can expose `localStorage` as undefined unless --localstorage-file is set. */
function ensureWebStorage() {
  if (!hasWorkingStorage(globalThis.localStorage)) {
    Object.defineProperty(globalThis, 'localStorage', {
      value: createInMemoryStorage(),
      configurable: true,
      writable: true
    });
  }

  if (!hasWorkingStorage(globalThis.sessionStorage)) {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createInMemoryStorage(),
      configurable: true,
      writable: true
    });
  }
}

ensureWebStorage();

beforeEach(() => {
  ensureWebStorage();
});
