import eventSkillSourcesJson from '@/modules/data/json/gametora/event-skill-sources.json';

type EventSkillSources = Record<
  string,
  {
    chain_event_skills: Array<number>;
    random_event_skills: Array<number>;
  }
>;

const eventSkillSources = eventSkillSourcesJson as EventSkillSources;

/**
 * Returns the set of skill IDs obtainable from chain events for a support card.
 * Chain events are the sequential story events unique to each support card that
 * fire in order during training (as opposed to random standalone events).
 */
export function getChainEventSkillIds(supportCardId: number): Set<number> {
  const entry = eventSkillSources[String(supportCardId)];
  return new Set(entry?.chain_event_skills ?? []);
}

/**
 * Returns the set of skill IDs obtainable from random events for a support card.
 * Random events are standalone events that can fire independently with some
 * probability during training.
 */
export function getRandomEventSkillIds(supportCardId: number): Set<number> {
  const entry = eventSkillSources[String(supportCardId)];
  return new Set(entry?.random_event_skills ?? []);
}

/**
 * Builds a map of support card ID → set of chain event skill IDs.
 */
export function loadChainEventSkillIds(): Map<number, Set<number>> {
  const result = new Map<number, Set<number>>();

  for (const [supportId, sources] of Object.entries(eventSkillSources)) {
    if (sources.chain_event_skills.length > 0) {
      result.set(Number(supportId), new Set(sources.chain_event_skills));
    }
  }

  return result;
}

/**
 * Builds a map of support card ID → set of random event skill IDs.
 */
export function loadRandomEventSkillIds(): Map<number, Set<number>> {
  const result = new Map<number, Set<number>>();

  for (const [supportId, sources] of Object.entries(eventSkillSources)) {
    if (sources.random_event_skills.length > 0) {
      result.set(Number(supportId), new Set(sources.random_event_skills));
    }
  }

  return result;
}
