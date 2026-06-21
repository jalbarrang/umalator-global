import { useId, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SlidersHorizontalIcon, SearchIcon, XIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger
} from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { config } from '@/config';
import { skillsService } from '@/modules/data/services/SkillService';
import { supportCardsService } from '@/modules/data/services/SupportCardService';
import type { SupportCardEntry } from '@/modules/data/services/SupportCardService';
import { SkillDetails } from '@/modules/skills/components/skill-details';
import { SkillIcon } from '@/modules/skills/components/skill-list/skill-item/SkillIcon';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const CARD_ROW_ESTIMATED_HEIGHT = 280;
const CARD_ROW_GAP = 12;
const CARD_ROW_OVERSCAN = 3;

type SupportSkill = SupportCardEntry['hintSkills'][number];

type SupportSkillOption = {
  value: string;
  label: string;
  hintCount: number;
  chainEventCount: number;
  randomEventCount: number;
};

type SupportCardData = {
  supportCards: ReturnType<typeof supportCardsService.getAll>;
  supportSkillOptions: Array<SupportSkillOption>;
  supportSkillLabelById: Map<string, string>;
};

// Lazily memoized: the support-card service is only populated after the data
// bootstrap, so this must not run at module-init time.
let supportCardDataCache: SupportCardData | null = null;

function getSupportCardData(): SupportCardData {
  if (supportCardDataCache) {
    return supportCardDataCache;
  }

  const supportCards = supportCardsService.getAll();
  const supportSkillStatsById = new Map<string, SupportSkillOption>();

  for (const card of supportCards) {
    for (const skill of card.hintSkills) {
      const skillId = `${skill.id}`;
      const stats = supportSkillStatsById.get(skillId) ?? {
        value: skillId,
        label: skill.name,
        hintCount: 0,
        chainEventCount: 0,
        randomEventCount: 0
      };

      stats.hintCount += 1;
      supportSkillStatsById.set(skillId, stats);
    }

    for (const skill of card.chainEventSkills) {
      const skillId = `${skill.id}`;
      const stats = supportSkillStatsById.get(skillId) ?? {
        value: skillId,
        label: skill.name,
        hintCount: 0,
        chainEventCount: 0,
        randomEventCount: 0
      };

      stats.chainEventCount += 1;
      supportSkillStatsById.set(skillId, stats);
    }

    for (const skill of card.randomEventSkills) {
      const skillId = `${skill.id}`;
      const stats = supportSkillStatsById.get(skillId) ?? {
        value: skillId,
        label: skill.name,
        hintCount: 0,
        chainEventCount: 0,
        randomEventCount: 0
      };

      stats.randomEventCount += 1;
      supportSkillStatsById.set(skillId, stats);
    }
  }

  const supportSkillOptions = Array.from(supportSkillStatsById.values()).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  const supportSkillLabelById = new Map(
    supportSkillOptions.map((skill) => [skill.value, skill.label] as const)
  );

  supportCardDataCache = { supportCards, supportSkillOptions, supportSkillLabelById };
  return supportCardDataCache;
}

const SUPPORT_CARD_FALLBACK_IMAGE = `${config.basePath}img/support-cards/support_thumb_00000.png`;

export function getSupportCardImageUrl(cardId: number) {
  return `${config.basePath}img/support-cards/support_card_s_${cardId}.png`;
}

function getSupportCardTypeLabel(type: number) {
  if (type === 1) return 'Speed';
  if (type === 2) return 'Stamina';
  if (type === 3) return 'Power';
  if (type === 4) return 'Guts';
  if (type === 5) return 'Wit';
  if (type === 6) return 'Pal';
  if (type === 7) return 'Group';

  return `Type ${type}`;
}

function getSupportCardRarityLabel(rarity: number) {
  if (rarity === 1) return 'R';
  if (rarity === 2) return 'SR';
  if (rarity === 3) return 'SSR';

  return `Rarity ${rarity}`;
}

const cardTypeOptions = [
  { value: '1', label: 'Speed' },
  { value: '2', label: 'Stamina' },
  { value: '3', label: 'Power' },
  { value: '4', label: 'Guts' },
  { value: '5', label: 'Wit' },
  { value: '6', label: 'Pal' },
  { value: '7', label: 'Group' }
];

const cardRarityOptions = [
  { value: '1', label: 'R' },
  { value: '2', label: 'SR' },
  { value: '3', label: 'SSR' }
];

type SkillSource = 'any' | 'hint' | 'chain' | 'random';

type SkillFilterEntry = {
  skillId: string;
  source: SkillSource;
};

const skillSourceOptions: Array<{ value: SkillSource; label: string }> = [
  { value: 'any', label: 'Any' },
  { value: 'hint', label: 'Hints' },
  { value: 'chain', label: 'Chain Events' },
  { value: 'random', label: 'Random Events' }
];

function getSkillSourceLabel(value: SkillSource) {
  if (value === 'any') return 'Any';
  if (value === 'hint') return 'Hints';
  if (value === 'chain') return 'Chain Events';
  if (value === 'random') return 'Random Events';
  return value;
}

type SkillSourceSelectProps = {
  values: string[];
  onValuesChange: (values: string[]) => void;
};

type FilterCheckboxGridProps = {
  title: string;
  options: Array<{ value: string; label: string }>;
  values: string[];
  onValuesChange: (values: string[]) => void;
};

function toggleFilterValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function FilterCheckboxGrid(props: FilterCheckboxGridProps) {
  const { title, options, values, onValuesChange } = props;

  return (
    <section className="grid gap-3">
      <div className="border-b border-primary pb-1 text-sm font-semibold text-primary">{title}</div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm font-medium">
            <Checkbox
              checked={values.includes(option.value)}
              onCheckedChange={() => onValuesChange(toggleFilterValue(values, option.value))}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}

type ActiveFilterChipsProps = {
  searchText: string;
  cardTypeFilters: string[];
  cardRarityFilters: string[];
  skillFilters: SkillFilterEntry[];
  onClearSearch: () => void;
  onClearCardType: (value: string) => void;
  onClearCardRarity: (value: string) => void;
  onClearSkill: (value: string) => void;
  onClearAll: () => void;
};

function ActiveFilterChips(props: ActiveFilterChipsProps) {
  const { supportSkillLabelById } = getSupportCardData();
  const {
    searchText,
    cardTypeFilters,
    cardRarityFilters,
    skillFilters,
    onClearSearch,
    onClearCardType,
    onClearCardRarity,
    onClearSkill,
    onClearAll
  } = props;

  const activeFilters = [
    searchText.trim()
      ? { key: 'search', label: `Search: ${searchText.trim()}`, onClear: onClearSearch }
      : null,
    ...cardTypeFilters.map((value) => ({
      key: `type-${value}`,
      label: `Type: ${getSupportCardTypeLabel(Number(value))}`,
      onClear: () => onClearCardType(value)
    })),
    ...cardRarityFilters.map((value) => ({
      key: `rarity-${value}`,
      label: `Rarity: ${getSupportCardRarityLabel(Number(value))}`,
      onClear: () => onClearCardRarity(value)
    })),
    ...skillFilters.map((entry) => {
      const sourceLabel = entry.source !== 'any' ? ` (${getSkillSourceLabel(entry.source)})` : '';

      return {
        key: `skill-${entry.skillId}`,
        label: `Has Skill: ${supportSkillLabelById.get(entry.skillId) ?? entry.skillId}${sourceLabel}`,
        onClear: () => onClearSkill(entry.skillId)
      };
    })
  ].filter((filter) => filter !== null);

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Filters:</span>
      {activeFilters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          className="inline-flex min-h-6 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
          onClick={filter.onClear}
        >
          <span>{filter.label}</span>
          <XIcon className="size-3" />
        </button>
      ))}
      <button
        type="button"
        className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        onClick={onClearAll}
      >
        Clear all
      </button>
    </div>
  );
}

type SupportCardFiltersDialogProps = {
  cardTypeFilters: string[];
  cardRarityFilters: string[];
  skillFilters: SkillFilterEntry[];
  activeFilterCount: number;
  onCardTypeFiltersChange: (values: string[]) => void;
  onCardRarityFiltersChange: (values: string[]) => void;
  onSkillFiltersChange: (values: SkillFilterEntry[]) => void;
};

function SupportCardFiltersDialog(props: SupportCardFiltersDialogProps) {
  const { supportSkillLabelById } = getSupportCardData();
  const {
    cardTypeFilters,
    cardRarityFilters,
    skillFilters,
    activeFilterCount,
    onCardTypeFiltersChange,
    onCardRarityFiltersChange,
    onSkillFiltersChange
  } = props;
  const [open, setOpen] = useState(false);
  const [draftCardTypeFilters, setDraftCardTypeFilters] = useState(cardTypeFilters);
  const [draftCardRarityFilters, setDraftCardRarityFilters] = useState(cardRarityFilters);
  const [draftSkillFilters, setDraftSkillFilters] = useState(skillFilters);

  const draftSelectedSkillIds = useMemo(
    () => draftSkillFilters.map((entry) => entry.skillId),
    [draftSkillFilters]
  );

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftCardTypeFilters(cardTypeFilters);
      setDraftCardRarityFilters(cardRarityFilters);
      setDraftSkillFilters(skillFilters);
    }

    setOpen(nextOpen);
  };

  const handleApplyFilters = () => {
    onCardTypeFiltersChange(draftCardTypeFilters);
    onCardRarityFiltersChange(draftCardRarityFilters);
    onSkillFiltersChange(draftSkillFilters);
  };

  const handleResetDraftFilters = () => {
    setDraftCardTypeFilters([]);
    setDraftCardRarityFilters([]);
    setDraftSkillFilters([]);
  };

  const handleSkillIdsChange = (skillIds: string[]) => {
    setDraftSkillFilters((prev) => {
      const existingBySkillId = new Map(prev.map((e) => [e.skillId, e]));

      return skillIds.map(
        (skillId) => existingBySkillId.get(skillId) ?? { skillId, source: 'any' as const }
      );
    });
  };

  const handleSkillSourceChange = (skillId: string, source: SkillSource) => {
    setDraftSkillFilters((prev) =>
      prev.map((entry) => (entry.skillId === skillId ? { ...entry, source } : entry))
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" className="h-9 w-full md:w-auto justify-center">
            <SlidersHorizontalIcon className="size-4" />
            Filters
            {activeFilterCount > 0 ? <Badge variant="secondary">{activeFilterCount}</Badge> : null}
          </Button>
        }
      />
      <DialogContent className="max-h-[min(42rem,calc(100dvh-2rem))] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="border-b bg-card p-4">
          <DialogTitle>Support Card Filters</DialogTitle>
          <DialogDescription>
            Filter support cards by rarity, specialty, and skills.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[calc(100dvh-12rem)] gap-5 overflow-y-auto p-4">
          <FilterCheckboxGrid
            title="Rarity"
            options={cardRarityOptions}
            values={draftCardRarityFilters}
            onValuesChange={setDraftCardRarityFilters}
          />

          <FilterCheckboxGrid
            title="Specialty"
            options={cardTypeOptions}
            values={draftCardTypeFilters}
            onValuesChange={setDraftCardTypeFilters}
          />

          <section className="grid gap-3">
            <div className="border-b border-primary pb-1 text-sm font-semibold text-primary">
              Has Skill
            </div>
            <SkillSourceSelect
              values={draftSelectedSkillIds}
              onValuesChange={handleSkillIdsChange}
            />
            {draftSkillFilters.length > 0 ? (
              <div className="grid gap-1.5">
                {draftSkillFilters.map((entry) => (
                  <div
                    key={entry.skillId}
                    className="flex items-center gap-2 rounded-md border bg-background px-2 py-1.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {supportSkillLabelById.get(entry.skillId) ?? entry.skillId}
                    </span>
                    <Select
                      value={entry.source}
                      onValueChange={(source) =>
                        handleSkillSourceChange(entry.skillId, source as SkillSource)
                      }
                    >
                      <SelectTrigger size="sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {skillSourceOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        handleSkillIdsChange(
                          draftSelectedSkillIds.filter((id) => id !== entry.skillId)
                        )
                      }
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        </div>

        <DialogFooter className="m-0">
          <Button variant="outline" onClick={handleResetDraftFilters}>
            Reset Filters
          </Button>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <DialogClose render={<Button onClick={handleApplyFilters} />}>OK</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SkillSourceSelect(props: SkillSourceSelectProps) {
  const { supportSkillOptions } = getSupportCardData();
  const { values, onValuesChange } = props;
  const [inputValue, setInputValue] = useState('');

  const selectedSkillOptions = useMemo(() => {
    return supportSkillOptions.filter((skill) => values.includes(skill.value));
  }, [values, supportSkillOptions]);

  const filteredSkillOptions = useMemo(() => {
    const normalizedInput = inputValue.trim().toLowerCase();

    if (!normalizedInput) {
      return supportSkillOptions;
    }

    return supportSkillOptions.filter((skill) =>
      `${skill.value} ${skill.label}`.toLowerCase().includes(normalizedInput)
    );
  }, [inputValue, supportSkillOptions]);

  return (
    <Combobox
      items={supportSkillOptions}
      filteredItems={filteredSkillOptions}
      multiple
      value={selectedSkillOptions}
      onValueChange={(nextValue) => onValuesChange(nextValue.map((skill) => skill.value))}
      onInputValueChange={setInputValue}
      itemToStringLabel={(skill) => skill.label}
      itemToStringValue={(skill) => skill.value}
      isItemEqualToValue={(item, selectedItem) => item.value === selectedItem.value}
    >
      <div className="flex h-9 w-full items-center rounded-lg border border-input dark:bg-input/30">
        <SearchIcon className="ml-2.5 size-4 shrink-0 text-muted-foreground" />
        <ComboboxInput
          className="h-8 border-0 bg-transparent focus-visible:ring-0"
          placeholder="Has Skill"
        />
        <ComboboxTrigger />
      </div>

      <ComboboxContent className="max-h-80">
        <ComboboxEmpty>No skills found.</ComboboxEmpty>
        <ComboboxList>
          {(skill, index) => (
            <ComboboxItem key={skill.value} value={skill} index={index}>
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span>{skill.label}</span>
                <span className="text-xs text-muted-foreground">
                  ID {skill.value} · Hint: {skill.hintCount} · Chain: {skill.chainEventCount} ·
                  Random: {skill.randomEventCount}
                </span>
              </div>
              <ComboboxItemIndicator />
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type SupportSkillListProps = {
  title: string;
  skills: SupportSkill[];
  columns?: 1 | 2;
};

type SupportSkillItemProps = {
  skill: SupportSkill;
};

function SupportSkillItem(props: SupportSkillItemProps) {
  const { skill } = props;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const skillEntry = skillsService.getById(`${skill.id}`);

  const skillItem = (
    <button className={cn('flex flex-row items-center gap-2 border bg-background py-1 px-2')}>
      {skillEntry ? (
        <span className="[&_img]:size-7">
          <SkillIcon iconId={skillEntry.iconId} />
        </span>
      ) : (
        <span className="size-6 rounded bg-muted" />
      )}

      <span>
        <span className="text-sm wrap-break-word font-medium">{skill.name}</span>
      </span>
    </button>
  );

  if (!skillEntry) {
    return skillItem;
  }

  return (
    <Popover open={detailsOpen} onOpenChange={setDetailsOpen}>
      <PopoverTrigger render={skillItem} />

      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={8}
        className="max-h-[min(36rem,calc(100dvh-2rem))] w-[400px] border p-0 text-card-foreground"
      >
        {detailsOpen ? <SkillDetails skill={skillEntry} variant="compact" /> : null}
      </PopoverContent>
    </Popover>
  );
}

function SupportSkillList(props: SupportSkillListProps) {
  const { title, skills, columns = 1 } = props;

  return (
    <section className="grid gap-2">
      <div className="text-xs font-medium text-muted-foreground">
        {title} ({skills.length})
      </div>
      {skills.length > 0 ? (
        <div className={columns === 2 ? 'grid grid-cols-2 gap-1.5' : 'grid gap-1.5'}>
          {skills.map((skill) => (
            <SupportSkillItem key={skill.id} skill={skill} />
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No {title.toLowerCase()} recorded.
        </div>
      )}
    </section>
  );
}

type SupportCardItemProps = {
  card: SupportCardEntry;
};

function SupportCardItem(props: SupportCardItemProps) {
  const { card } = props;

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-xs">
      <div className="flex gap-3 border-b p-2">
        <div className="rounded-md border bg-muted">
          <img
            src={getSupportCardImageUrl(card.id)}
            alt=""
            className="aspect-square size-20 object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = SUPPORT_CARD_FALLBACK_IMAGE;
            }}
          />
        </div>

        <div className="space-y-2">
          <div className="text-sm">
            <span className="font-semibold">{card.name} - </span>
            <span>{card.charaName}</span>
          </div>

          <div className="flex flex-wrap content-start gap-1.5">
            <Badge variant="secondary">{getSupportCardRarityLabel(card.rarity)}</Badge>
            <Badge variant="outline">ID {card.id}</Badge>
            <Badge variant="outline">{getSupportCardTypeLabel(card.supportCardType)}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-3">
        <SupportSkillList title="Hint skills" skills={card.hintSkills} columns={2} />
        <SupportSkillList title="Chain event skills" skills={card.chainEventSkills} />
        <SupportSkillList title="Random event skills" skills={card.randomEventSkills} />
      </div>
    </div>
  );
}

function getGridColumns() {
  if (typeof window === 'undefined') return 1;
  if (window.innerWidth >= 1280) return 4;
  if (window.innerWidth >= 768) return 2;
  return 1;
}

function useGridColumns() {
  const [columns, setColumns] = useState(getGridColumns);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setColumns(getGridColumns());
      return;
    }

    const xlMql = window.matchMedia('(min-width: 1280px)');
    const mdMql = window.matchMedia('(min-width: 768px)');

    const update = () => {
      if (xlMql.matches) setColumns(4);
      else if (mdMql.matches) setColumns(2);
      else setColumns(1);
    };

    xlMql.addEventListener('change', update);
    mdMql.addEventListener('change', update);
    update();

    return () => {
      xlMql.removeEventListener('change', update);
      mdMql.removeEventListener('change', update);
    };
  }, []);

  return columns;
}

function SupportCardsUpcomingToggle(props: { checked: boolean; onToggle: () => void }) {
  const { checked, onToggle } = props;
  const checkboxId = useId();

  return (
    <div className="flex h-9 items-center gap-2 rounded-md border px-3">
      <Checkbox id={checkboxId} checked={checked} onCheckedChange={() => onToggle()} />
      <Label htmlFor={checkboxId} className="text-sm font-normal">
        Show upcoming
      </Label>
    </div>
  );
}

export function SupportCardsPage() {
  const { supportCards } = getSupportCardData();
  const [searchText, setSearchText] = useState('');
  const [skillFilters, setSkillFilters] = useState<SkillFilterEntry[]>([]);
  const [cardTypeFilters, setCardTypeFilters] = useState<string[]>([]);
  const [cardRarityFilters, setCardRarityFilters] = useState<string[]>([]);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const deferredSearchText = useDeferredValue(searchText);
  const columns = useGridColumns();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeFilterCount = cardTypeFilters.length + cardRarityFilters.length + skillFilters.length;

  const filteredCards = useMemo(() => {
    const normalizedSearch = deferredSearchText.trim().toLowerCase();

    return supportCards.filter((card) => {
      if (!showUpcoming && !card.released) {
        return false;
      }

      if (cardTypeFilters.length > 0 && !cardTypeFilters.includes(`${card.supportCardType}`)) {
        return false;
      }

      if (cardRarityFilters.length > 0 && !cardRarityFilters.includes(`${card.rarity}`)) {
        return false;
      }

      if (normalizedSearch) {
        const searchableText = [
          card.id,
          card.name,
          card.charaId,
          card.charaName,
          getSupportCardRarityLabel(card.rarity),
          getSupportCardTypeLabel(card.supportCardType),
          ...card.hintSkills.map((skill) => skill.name),
          ...card.chainEventSkills.map((skill) => skill.name),
          ...card.randomEventSkills.map((skill) => skill.name)
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(normalizedSearch)) {
          return false;
        }
      }

      if (skillFilters.length > 0) {
        const hintSkillIds = new Set(card.hintSkills.map((s) => `${s.id}`));
        const chainSkillIds = new Set(card.chainEventSkills.map((s) => `${s.id}`));
        const randomSkillIds = new Set(card.randomEventSkills.map((s) => `${s.id}`));

        const hasAllSkills = skillFilters.every((entry) => {
          if (entry.source === 'hint') return hintSkillIds.has(entry.skillId);
          if (entry.source === 'chain') return chainSkillIds.has(entry.skillId);
          if (entry.source === 'random') return randomSkillIds.has(entry.skillId);
          return (
            hintSkillIds.has(entry.skillId) ||
            chainSkillIds.has(entry.skillId) ||
            randomSkillIds.has(entry.skillId)
          );
        });

        if (!hasAllSkills) {
          return false;
        }
      }

      return true;
    });
  }, [
    cardRarityFilters,
    cardTypeFilters,
    deferredSearchText,
    skillFilters,
    showUpcoming,
    supportCards
  ]);

  const rowCount = Math.ceil(filteredCards.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => CARD_ROW_ESTIMATED_HEIGHT,
    gap: CARD_ROW_GAP,
    overscan: CARD_ROW_OVERSCAN,
    getItemKey: (index) => {
      const startIdx = index * columns;
      return filteredCards[startIdx]?.id ?? `row-${index}`;
    }
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3 md:p-4">
      <header className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold leading-tight">Support Cards</h1>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredCards.length} of {supportCards.length} support cards
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[minmax(16rem,32rem)_auto] md:items-center">
          <InputGroup className="h-9">
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              type="text"
              value={searchText}
              placeholder="Search cards, characters, IDs..."
              onChange={(event) => setSearchText(event.target.value)}
            />
          </InputGroup>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
            <SupportCardsUpcomingToggle
              checked={showUpcoming}
              onToggle={() => setShowUpcoming((v) => !v)}
            />

            <div className="w-full md:w-auto">
              <SupportCardFiltersDialog
                cardTypeFilters={cardTypeFilters}
                cardRarityFilters={cardRarityFilters}
                skillFilters={skillFilters}
                activeFilterCount={activeFilterCount}
                onCardTypeFiltersChange={setCardTypeFilters}
                onCardRarityFiltersChange={setCardRarityFilters}
                onSkillFiltersChange={setSkillFilters}
              />
            </div>
          </div>
        </div>

        <ActiveFilterChips
          searchText={searchText}
          cardTypeFilters={cardTypeFilters}
          cardRarityFilters={cardRarityFilters}
          skillFilters={skillFilters}
          onClearSearch={() => setSearchText('')}
          onClearCardType={(value) =>
            setCardTypeFilters((filters) => filters.filter((filter) => filter !== value))
          }
          onClearCardRarity={(value) =>
            setCardRarityFilters((filters) => filters.filter((filter) => filter !== value))
          }
          onClearSkill={(skillId) =>
            setSkillFilters((filters) => filters.filter((f) => f.skillId !== skillId))
          }
          onClearAll={() => {
            setSearchText('');
            setCardTypeFilters([]);
            setCardRarityFilters([]);
            setSkillFilters([]);
          }}
        />
      </header>

      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        {filteredCards.length > 0 ? (
          <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const rowStartIndex = virtualRow.index * columns;
              const rowCards = filteredCards.slice(
                rowStartIndex,
                Math.min(rowStartIndex + columns, filteredCards.length)
              );

              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  data-index={virtualRow.index}
                >
                  <div
                    className="grid gap-3"
                    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                  >
                    {rowCards.map((card) => (
                      <SupportCardItem key={card.id} card={card} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border">
            <div className="text-sm text-muted-foreground">
              No support cards match the current search.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
