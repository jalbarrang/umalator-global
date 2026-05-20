import { umasService } from '@/modules/data/registry';
import type { UmaAptitudes } from '@/modules/data/services/UmaService';
import { aptitudeToEncoding } from '@/modules/runners/share/converters';
import type { UmaSearchEntry } from '@/modules/runners/utils';

export type UmaAptitudeKey = keyof UmaAptitudes;
export type UmaAptitudeFilters = Partial<Record<UmaAptitudeKey, number>>;

type UmaPredicate = (uma: UmaSearchEntry) => boolean;

/**
 * Simple fuzzy match - checks if all chars in pattern appear in order in target.
 * Returns a score (higher is better match), or -1 for no match.
 */
function fuzzyMatch(pattern: string, target: string): number {
  const patternLower = pattern.toLowerCase();
  const targetLower = target.toLowerCase();

  let patternIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (let i = 0; i < targetLower.length && patternIdx < patternLower.length; i++) {
    if (targetLower[i] === patternLower[patternIdx]) {
      if (lastMatchIdx === i - 1) score += 2;
      if (i === 0 || targetLower[i - 1] === ' ') score += 3;
      score += 1;
      lastMatchIdx = i;
      patternIdx++;
    }
  }

  return patternIdx === patternLower.length ? score : -1;
}

/**
 * SQL-like query builder for filtering runner outfits (umas).
 */
export class UmaQuery {
  private umas: Array<UmaSearchEntry>;
  private predicates: Array<UmaPredicate> = [];

  private constructor(umas: Array<UmaSearchEntry>) {
    this.umas = umas;
  }

  static from(umas: Array<UmaSearchEntry>): UmaQuery {
    return new UmaQuery(umas);
  }

  /**
   * WHERE outfit is released. No-op when isUpcoming is true.
   */
  whereIsUpcoming(isUpcoming: boolean): this {
    if (isUpcoming) return this;

    this.predicates.push((uma) => umasService.isReleased(uma.id));

    return this;
  }

  /**
   * WHERE text matches runner name or outfit epithet.
   */
  whereText(searchText: string): this {
    if (searchText.length === 0) return this;

    const normalizedSearch = searchText.replace(/\./g, '');

    this.predicates.push((uma) => {
      const target = `${uma.outfit} ${uma.name}`.replace(/\./g, '');

      if (target.toUpperCase().includes(normalizedSearch.toUpperCase())) {
        return true;
      }

      return fuzzyMatch(normalizedSearch, target) > 0;
    });

    return this;
  }

  /**
   * WHERE innate aptitude grades are at least the selected minimums.
   * Filters are ANDed together.
   */
  whereAptitudes(filters: UmaAptitudeFilters): this {
    const activeFilters = Object.entries(filters).filter(
      (entry): entry is [UmaAptitudeKey, number] => {
        const [, minGrade] = entry;
        return minGrade != null;
      }
    );

    if (activeFilters.length === 0) return this;

    this.predicates.push((uma) =>
      activeFilters.every(([key, minGrade]) => aptitudeToEncoding(uma.aptitudes[key]) >= minGrade)
    );

    return this;
  }

  /**
   * WHERE custom predicate.
   */
  where(predicate: UmaPredicate): this {
    this.predicates.push(predicate);
    return this;
  }

  /**
   * Execute the query and return filtered runner outfits.
   * All predicates are ANDed together.
   */
  execute(): Array<UmaSearchEntry> {
    return this.umas.filter((uma) => this.predicates.every((predicate) => predicate(uma)));
  }
}
