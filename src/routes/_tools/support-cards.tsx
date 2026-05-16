import { useDeferredValue, useMemo, useState } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxList,
  ComboboxTrigger
} from '@/components/ui/combobox';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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

type FilterSelectProps = {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
};

function FilterSelect(props: FilterSelectProps) {
  const { label, value, onValueChange, options } = props;

  return (
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? 'all')}>
      <SelectTrigger size="sm" className="h-9 w-full">
        <SelectValue>
          {value === 'all'
            ? label
            : (options.find((option) => option.value === value)?.label ?? label)}
        </SelectValue>
      </SelectTrigger>

      <SelectContent>
        <SelectItem value="all">{label}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type SkillSourceSelectProps = {
  value: string | null;
  onValueChange: (value: string | null) => void;
};

type ActiveFilterChipsProps = {
  searchText: string;
  cardTypeFilter: string;
  cardRarityFilter: string;
  selectedSkillSourceId: string | null;
  onClearSearch: () => void;
  onClearCardType: () => void;
  onClearCardRarity: () => void;
  onClearSkill: () => void;
  onClearAll: () => void;
};

function ActiveFilterChips(props: ActiveFilterChipsProps) {
  const {
    searchText,
    cardTypeFilter,
    cardRarityFilter,
    selectedSkillSourceId,
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
    cardTypeFilter !== 'all'
      ? {
          key: 'type',
          label: `Type: ${getSupportCardTypeLabel(Number(cardTypeFilter))}`,
          onClear: onClearCardType
        }
      : null,
    cardRarityFilter !== 'all'
      ? {
          key: 'rarity',
          label: `Rarity: ${getSupportCardRarityLabel(Number(cardRarityFilter))}`,
          onClear: onClearCardRarity
        }
      : null,
    selectedSkillSourceId
      ? {
          key: 'skill',
          label: `Has Skill: ${supportSkillLabelById.get(selectedSkillSourceId) ?? selectedSkillSourceId}`,
          onClear: onClearSkill
        }
      : null
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

function SkillSourceSelect(props: SkillSourceSelectProps) {
  const { value, onValueChange } = props;
  const [inputValue, setInputValue] = useState('');

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
      value={value}
      onValueChange={(nextValue) => onValueChange(nextValue)}
      onInputValueChange={setInputValue}
      itemToStringLabel={(skillId) => supportSkillLabelById.get(skillId) ?? skillId}
    >
      <div className="flex h-9 w-full items-center rounded-lg border border-input dark:bg-input/30">
        <SearchIcon className="ml-2.5 size-4 shrink-0 text-muted-foreground" />
        <ComboboxInput
          className="h-8 border-0 bg-transparent focus-visible:ring-0"
          placeholder="Has Skill"
        />
        <ComboboxClear onClick={() => onValueChange(null)} />
        <ComboboxTrigger />
      </div>

      <ComboboxContent className="max-h-80">
        <ComboboxEmpty>No skills found.</ComboboxEmpty>
        <ComboboxList>
          {filteredSkillOptions.map((skill, index) => (
            <ComboboxItem key={skill.value} value={skill.value} index={index}>
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span>{skill.label}</span>
                <span className="text-xs text-muted-foreground">
                  ID {skill.value} · Hint: {skill.hintCount} · Event: {skill.eventCount}
                </span>
              </div>
              <ComboboxItemIndicator />
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

type SkillChipListProps = {
  title: string;
  skills: SupportSkill[];
  columns?: 1 | 2;
  showRarity?: boolean;
  highlightedSkillId?: string | null;
};

function SkillChipList(props: SkillChipListProps) {
  const { title, skills, columns = 1, showRarity = true, highlightedSkillId = null } = props;

  return (
    <section className="grid gap-2">
      <div className="text-xs font-medium text-muted-foreground">
        {title} ({skills.length})
      </div>
      {skills.length > 0 ? (
        <div className={columns === 2 ? 'grid grid-cols-2 gap-1.5' : 'flex flex-wrap gap-1.5'}>
          {skills.map((skill) => {
            const isHighlighted = highlightedSkillId === `${skill.id}`;

            return (
              <Badge
                key={skill.id}
                variant={isHighlighted ? 'secondary' : 'outline'}
                className="h-auto min-h-5 max-w-full justify-start py-1"
              >
                <span>{skill.name}</span>
                {showRarity ? (
                  <span className="text-muted-foreground">{getSkillRarityLabel(skill.rarity)}</span>
                ) : null}
              </Badge>
            );
          })}
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
  highlightedSkillId?: string | null;
};

function SupportCardItem(props: SupportCardItemProps) {
  const { card, highlightedSkillId = null } = props;

  return (
    <Card size="sm">
      <CardHeader className="border-b">
        <CardTitle className="flex min-w-0 items-center gap-2">
          <span>{card.name}</span>
          <Badge variant="secondary">{getSupportCardRarityLabel(card.rarity)}</Badge>
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-1.5">
          <Badge variant="outline">ID {card.id}</Badge>
          <Badge variant="outline">{card.charaName}</Badge>
          <Badge variant="outline">{getSupportCardTypeLabel(card.supportCardType)}</Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="grid gap-4">
        <SkillChipList
          title="Hint skills"
          skills={card.hintSkills}
          columns={2}
          showRarity={false}
          highlightedSkillId={highlightedSkillId}
        />
        <SkillChipList
          title="Event skills"
          skills={card.eventSkills}
          highlightedSkillId={highlightedSkillId}
        />
      </CardContent>
    </Card>
  );
}

export function SupportCardsPage() {
  const [searchText, setSearchText] = useState('');
  const [selectedSkillSourceId, setSelectedSkillSourceId] = useState<string | null>(null);
  const [cardTypeFilter, setCardTypeFilter] = useState('all');
  const [cardRarityFilter, setCardRarityFilter] = useState('all');
  const deferredSearchText = useDeferredValue(searchText);

  const filteredCards = useMemo(() => {
    const normalizedSearch = deferredSearchText.trim().toLowerCase();

    return supportCards.filter((card) => {
      if (cardTypeFilter !== 'all' && `${card.supportCardType}` !== cardTypeFilter) {
        return false;
      }

      if (cardRarityFilter !== 'all' && `${card.rarity}` !== cardRarityFilter) {
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

      if (selectedSkillSourceId) {
        const hasSelectedSkill = [...card.hintSkills, ...card.eventSkills].some(
          (skill) => `${skill.id}` === selectedSkillSourceId
        );

        if (!hasSelectedSkill) {
          return false;
        }
      }

      return true;
    });
  }, [cardRarityFilter, cardTypeFilter, deferredSearchText, selectedSkillSourceId]);

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

        <div className="grid gap-2 md:grid-cols-[minmax(16rem,1fr)_9rem_9rem_minmax(16rem,0.8fr)] md:items-center">
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

          <FilterSelect
            label="Card Type"
            value={cardTypeFilter}
            onValueChange={setCardTypeFilter}
            options={cardTypeOptions}
          />
          <FilterSelect
            label="Card Rarity"
            value={cardRarityFilter}
            onValueChange={setCardRarityFilter}
            options={cardRarityOptions}
          />
          <SkillSourceSelect
            value={selectedSkillSourceId}
            onValueChange={setSelectedSkillSourceId}
          />
        </div>

        <ActiveFilterChips
          searchText={searchText}
          cardTypeFilter={cardTypeFilter}
          cardRarityFilter={cardRarityFilter}
          selectedSkillSourceId={selectedSkillSourceId}
          onClearSearch={() => setSearchText('')}
          onClearCardType={() => setCardTypeFilter('all')}
          onClearCardRarity={() => setCardRarityFilter('all')}
          onClearSkill={() => setSelectedSkillSourceId(null)}
          onClearAll={() => {
            setSearchText('');
            setCardTypeFilter('all');
            setCardRarityFilter('all');
            setSelectedSkillSourceId(null);
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
                highlightedSkillId={selectedSkillSourceId}
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
