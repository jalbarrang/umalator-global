import { useDeferredValue, useMemo, useState } from 'react';
import { SlidersHorizontalIcon, SearchIcon, XIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { config } from '@/config';
import { cn } from '@/lib/utils';
import { dataRegistry } from '@/modules/data/registry';
import { SkillIcon } from '@/modules/skills/components/skill-list/skill-item/SkillIcon';
import supportCardsJson from '@/modules/data/json/support-cards.json';

type SupportSkill = {
  id: number;
  name: string;
  rarity: number;
};

type SupportCardEntry = {
  id: number;
  name: string;
  charaId: number;
  charaName: string;
  rarity: number;
  supportCardType: number;
  hintSkills: SupportSkill[];
  eventSkills: SupportSkill[];
};

const supportCards = Object.values(supportCardsJson) as SupportCardEntry[];

const supportSkillOptions = Array.from(
  new Map(
    supportCards
      .flatMap((card) => [...card.hintSkills, ...card.eventSkills])
      .map((skill) => {
        const skillId = `${skill.id}`;
        const hintCount = supportCards.filter((card) =>
          card.hintSkills.some((hintSkill) => `${hintSkill.id}` === skillId)
        ).length;
        const eventCount = supportCards.filter((card) =>
          card.eventSkills.some((eventSkill) => `${eventSkill.id}` === skillId)
        ).length;

        return [skillId, { value: skillId, label: skill.name, hintCount, eventCount }];
      })
  ).values()
).sort((a, b) => a.label.localeCompare(b.label));

const supportSkillLabelById = new Map(
  supportSkillOptions.map((skill) => [skill.value, skill.label] as const)
);

function getSupportCardImageUrl(cardId: number) {
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

function getSkillRarityLabel(rarity: number) {
  if (rarity === 1) return 'White';
  if (rarity === 2) return 'Gold';
  if (rarity === 3) return 'Lesser Unique';
  if (rarity === 4) return 'Unique';
  if (rarity === 5) return 'Unique';
  if (rarity === 6) return 'Evolved';

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
  selectedSkillSourceIds: string[];
  onClearSearch: () => void;
  onClearCardType: (value: string) => void;
  onClearCardRarity: (value: string) => void;
  onClearSkill: (value: string) => void;
  onClearAll: () => void;
};

function ActiveFilterChips(props: ActiveFilterChipsProps) {
  const {
    searchText,
    cardTypeFilters,
    cardRarityFilters,
    selectedSkillSourceIds,
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
    ...selectedSkillSourceIds.map((value) => ({
      key: `skill-${value}`,
      label: `Has Skill: ${supportSkillLabelById.get(value) ?? value}`,
      onClear: () => onClearSkill(value)
    }))
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
  selectedSkillSourceIds: string[];
  activeFilterCount: number;
  onCardTypeFiltersChange: (values: string[]) => void;
  onCardRarityFiltersChange: (values: string[]) => void;
  onSelectedSkillSourceIdsChange: (values: string[]) => void;
};

function SupportCardFiltersDialog(props: SupportCardFiltersDialogProps) {
  const {
    cardTypeFilters,
    cardRarityFilters,
    selectedSkillSourceIds,
    activeFilterCount,
    onCardTypeFiltersChange,
    onCardRarityFiltersChange,
    onSelectedSkillSourceIdsChange
  } = props;
  const [open, setOpen] = useState(false);
  const [draftCardTypeFilters, setDraftCardTypeFilters] = useState(cardTypeFilters);
  const [draftCardRarityFilters, setDraftCardRarityFilters] = useState(cardRarityFilters);
  const [draftSelectedSkillSourceIds, setDraftSelectedSkillSourceIds] =
    useState(selectedSkillSourceIds);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftCardTypeFilters(cardTypeFilters);
      setDraftCardRarityFilters(cardRarityFilters);
      setDraftSelectedSkillSourceIds(selectedSkillSourceIds);
    }

    setOpen(nextOpen);
  };

  const handleApplyFilters = () => {
    onCardTypeFiltersChange(draftCardTypeFilters);
    onCardRarityFiltersChange(draftCardRarityFilters);
    onSelectedSkillSourceIdsChange(draftSelectedSkillSourceIds);
  };

  const handleResetDraftFilters = () => {
    setDraftCardTypeFilters([]);
    setDraftCardRarityFilters([]);
    setDraftSelectedSkillSourceIds([]);
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
              values={draftSelectedSkillSourceIds}
              onValuesChange={setDraftSelectedSkillSourceIds}
            />
            {draftSelectedSkillSourceIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {draftSelectedSkillSourceIds.map((skillId) => (
                  <button
                    key={skillId}
                    type="button"
                    className="inline-flex min-h-6 items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs font-medium hover:bg-accent hover:text-accent-foreground"
                    onClick={() =>
                      setDraftSelectedSkillSourceIds((skillIds) =>
                        skillIds.filter((selectedSkillId) => selectedSkillId !== skillId)
                      )
                    }
                  >
                    <span>{supportSkillLabelById.get(skillId) ?? skillId}</span>
                    <XIcon className="size-3" />
                  </button>
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
  const { values, onValuesChange } = props;
  const [inputValue, setInputValue] = useState('');

  const selectedSkillOptions = useMemo(() => {
    return supportSkillOptions.filter((skill) => values.includes(skill.value));
  }, [values]);

  const filteredSkillOptions = useMemo(() => {
    const normalizedInput = inputValue.trim().toLowerCase();

    if (!normalizedInput) {
      return supportSkillOptions;
    }

    return supportSkillOptions.filter((skill) =>
      `${skill.value} ${skill.label}`.toLowerCase().includes(normalizedInput)
    );
  }, [inputValue]);

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
                  ID {skill.value} · Hint: {skill.hintCount} · Event: {skill.eventCount}
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
  showRarity?: boolean;
  highlightedSkillIds?: string[];
};

type SupportSkillItemProps = {
  skill: SupportSkill;
  showRarity: boolean;
  highlighted: boolean;
};

function SupportSkillItem(props: SupportSkillItemProps) {
  const { skill, showRarity, highlighted } = props;
  const skillEntry = dataRegistry.skills.getById(`${skill.id}`);

  return (
    <div
      className={cn(
        'grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md border bg-background p-2 text-xs',
        highlighted && 'border-primary bg-primary/10'
      )}
    >
      {skillEntry ? (
        <span className="[&_img]:size-6">
          <SkillIcon iconId={skillEntry.iconId} />
        </span>
      ) : (
        <div className="size-6 rounded bg-muted" />
      )}

      <div className="grid min-w-0 gap-0.5">
        <span className="font-medium leading-tight">{skill.name}</span>
        {showRarity ? (
          <span className="text-[11px] leading-tight text-muted-foreground">
            {getSkillRarityLabel(skill.rarity)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function SupportSkillList(props: SupportSkillListProps) {
  const { title, skills, columns = 1, showRarity = true, highlightedSkillIds = [] } = props;

  return (
    <section className="grid gap-2">
      <div className="text-xs font-medium text-muted-foreground">
        {title} ({skills.length})
      </div>
      {skills.length > 0 ? (
        <div className={columns === 2 ? 'grid grid-cols-2 gap-1.5' : 'grid gap-1.5'}>
          {skills.map((skill) => (
            <SupportSkillItem
              key={skill.id}
              skill={skill}
              showRarity={showRarity}
              highlighted={highlightedSkillIds.includes(`${skill.id}`)}
            />
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
  highlightedSkillIds?: string[];
};

function SupportCardItem(props: SupportCardItemProps) {
  const { card, highlightedSkillIds = [] } = props;

  return (
    <Card size="sm">
      <CardHeader className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 border-b">
        <div className="row-span-2 overflow-hidden rounded-md border bg-muted">
          <img
            src={getSupportCardImageUrl(card.id)}
            alt=""
            className="aspect-square h-full w-full object-cover"
            loading="lazy"
          />
        </div>

        <CardTitle className="flex min-w-0 items-start gap-2">
          <span>{card.name}</span>
          <Badge variant="secondary">{getSupportCardRarityLabel(card.rarity)}</Badge>
        </CardTitle>
        <CardDescription className="flex flex-wrap content-start gap-1.5">
          <Badge variant="outline">ID {card.id}</Badge>
          <Badge variant="outline">{card.charaName}</Badge>
          <Badge variant="outline">{getSupportCardTypeLabel(card.supportCardType)}</Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <SupportSkillList
          title="Hint skills"
          skills={card.hintSkills}
          columns={2}
          showRarity={false}
          highlightedSkillIds={highlightedSkillIds}
        />
        <SupportSkillList
          title="Event skills"
          skills={card.eventSkills}
          highlightedSkillIds={highlightedSkillIds}
        />
      </CardContent>
    </Card>
  );
}

export function SupportCardsPage() {
  const [searchText, setSearchText] = useState('');
  const [selectedSkillSourceIds, setSelectedSkillSourceIds] = useState<string[]>([]);
  const [cardTypeFilters, setCardTypeFilters] = useState<string[]>([]);
  const [cardRarityFilters, setCardRarityFilters] = useState<string[]>([]);
  const deferredSearchText = useDeferredValue(searchText);
  const activeFilterCount =
    cardTypeFilters.length + cardRarityFilters.length + selectedSkillSourceIds.length;

  const filteredCards = useMemo(() => {
    const normalizedSearch = deferredSearchText.trim().toLowerCase();

    return supportCards.filter((card) => {
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
          ...card.eventSkills.map((skill) => skill.name)
        ]
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(normalizedSearch)) {
          return false;
        }
      }

      if (selectedSkillSourceIds.length > 0) {
        const cardSkillIds = new Set(
          [...card.hintSkills, ...card.eventSkills].map((skill) => `${skill.id}`)
        );
        const hasAllSelectedSkills = selectedSkillSourceIds.every((skillId) =>
          cardSkillIds.has(skillId)
        );

        if (!hasAllSelectedSkills) {
          return false;
        }
      }

      return true;
    });
  }, [cardRarityFilters, cardTypeFilters, deferredSearchText, selectedSkillSourceIds]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3 md:p-4">
      <header className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold leading-tight">Support Cards</h1>
            <Badge variant="destructive">Development only</Badge>
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

          <div className="w-full md:w-auto">
            <SupportCardFiltersDialog
              cardTypeFilters={cardTypeFilters}
              cardRarityFilters={cardRarityFilters}
              selectedSkillSourceIds={selectedSkillSourceIds}
              activeFilterCount={activeFilterCount}
              onCardTypeFiltersChange={setCardTypeFilters}
              onCardRarityFiltersChange={setCardRarityFilters}
              onSelectedSkillSourceIdsChange={setSelectedSkillSourceIds}
            />
          </div>
        </div>

        <ActiveFilterChips
          searchText={searchText}
          cardTypeFilters={cardTypeFilters}
          cardRarityFilters={cardRarityFilters}
          selectedSkillSourceIds={selectedSkillSourceIds}
          onClearSearch={() => setSearchText('')}
          onClearCardType={(value) =>
            setCardTypeFilters((filters) => filters.filter((filter) => filter !== value))
          }
          onClearCardRarity={(value) =>
            setCardRarityFilters((filters) => filters.filter((filter) => filter !== value))
          }
          onClearSkill={(value) =>
            setSelectedSkillSourceIds((skillIds) => skillIds.filter((skillId) => skillId !== value))
          }
          onClearAll={() => {
            setSearchText('');
            setCardTypeFilters([]);
            setCardRarityFilters([]);
            setSelectedSkillSourceIds([]);
          }}
        />
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {filteredCards.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {filteredCards.map((card) => (
              <SupportCardItem
                key={card.id}
                card={card}
                highlightedSkillIds={selectedSkillSourceIds}
              />
            ))}
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
