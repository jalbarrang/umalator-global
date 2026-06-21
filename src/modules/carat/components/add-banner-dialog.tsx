import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { useShallow } from 'zustand/shallow';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { bannerImageUrl } from '@/modules/carat/data/banner-image';
import { resolveBannerLabel } from '@/modules/carat/data/card-names';
import type {
  TimelineEvent,
  TimelinePayload,
  TimelinePredictionKind
} from '@/modules/carat/data/timeline-types';
import { addPlannedBanner, removePlannedBanner, useCaratStore } from '@/store/carat.store';
import { cn } from '@/lib/utils';

type BannerTypeFilter = 'all' | 'character' | 'support';
type ConfidenceFilter = 'all' | TimelinePredictionKind;

type AddBannerDialogProps = {
  timeline: TimelinePayload;
};

type FilterOption<T extends string> = { value: T; label: string };

const TYPE_OPTIONS: FilterOption<BannerTypeFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'character', label: 'Characters' },
  { value: 'support', label: 'Support' }
];

const CONFIDENCE_OPTIONS: FilterOption<ConfidenceFilter>[] = [
  { value: 'all', label: 'All' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'interpolated', label: 'Estimated' },
  { value: 'extrapolated', label: 'Predicted' }
];

/**
 * Confidence is encoded with the warm token ramp by descending emphasis, not raw
 * palette hues: a filled chip reads as locked-in, an outline as estimated, faint
 * muted as a loose prediction. Tokenized + on-brand (no off-system emerald/amber).
 */
function ConfidenceBadge(props: { kind: TimelinePredictionKind | undefined }) {
  const { kind } = props;
  if (kind === 'confirmed') return <Badge variant="secondary">Confirmed</Badge>;
  if (kind === 'interpolated') return <Badge variant="outline">Estimated</Badge>;
  return (
    <Badge variant="ghost" className="text-muted-foreground">
      Predicted
    </Badge>
  );
}

function typeLabel(cardType: string | null) {
  if (!cardType) return 'Banner';
  return cardType.charAt(0).toUpperCase() + cardType.slice(1);
}

function dateText(value: string | null | undefined) {
  if (!value) return 'Date TBD';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function windowSuffix(event: TimelineEvent) {
  const duration = event.banner_duration_days;
  return duration ? ` · ${duration}d` : '';
}

function searchableText(event: TimelineEvent) {
  return [
    resolveBannerLabel(event),
    event.related_characters?.join(' '),
    event.related_support_cards?.join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function FilterGroup<T extends string>(props: {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
}) {
  const { label, value, options, onChange } = props;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="flex flex-wrap gap-0.5 rounded-lg bg-muted p-0.5"
      >
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'inline-flex min-h-9 items-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-8',
                active
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function AddBannerDialog(props: AddBannerDialogProps) {
  const { timeline } = props;
  const [open, setOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<BannerTypeFilter>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all');
  const [search, setSearch] = useState('');
  const plannedBannerIds = useCaratStore(
    useShallow((state) => state.plannedBanners.map((banner) => banner.id))
  );
  const plannedIds = useMemo(() => new Set(plannedBannerIds), [plannedBannerIds]);

  const filtersActive = typeFilter !== 'all' || confidenceFilter !== 'all' || search.trim() !== '';
  const clearFilters = () => {
    setTypeFilter('all');
    setConfidenceFilter('all');
    setSearch('');
  };

  const banners = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const searchText = search.trim().toLowerCase();

    return timeline.events
      .filter((event) => event.type === 'character_banner' || event.type === 'support_card_banner')
      .filter((event) => {
        const date = event.global_release_date ? new Date(event.global_release_date) : null;
        return date !== null && date.getTime() >= today.getTime();
      })
      .filter((event) => typeFilter === 'all' || event.card_type === typeFilter)
      .filter((event) => confidenceFilter === 'all' || event.prediction?.kind === confidenceFilter)
      .filter((event) => !searchText || searchableText(event).includes(searchText))
      .sort(
        (a, b) =>
          new Date(a.global_release_date ?? 0).getTime() -
          new Date(b.global_release_date ?? 0).getTime()
      );
  }, [confidenceFilter, search, timeline.events, typeFilter]);

  // Toggle in place and keep the dialog open so a whole plan can be built in one pass.
  const handleToggle = (id: string) => {
    if (plannedIds.has(id)) {
      removePlannedBanner(id);
    } else {
      addPlannedBanner(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button data-tutorial="carat-add-banner" />}>
        + Add banner from timeline
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-5xl!"
        showCloseButton
      >
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add banners from timeline</DialogTitle>
          <DialogDescription>
            Tap to add or remove future banners. The list stays open so you can build your whole
            plan in one go.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-4">
          <FilterGroup
            label="Type"
            value={typeFilter}
            options={TYPE_OPTIONS}
            onChange={setTypeFilter}
          />
          <FilterGroup
            label="Confidence"
            value={confidenceFilter}
            options={CONFIDENCE_OPTIONS}
            onChange={setConfidenceFilter}
          />
        </div>

        <div className="flex items-center justify-between gap-2 px-4 pt-2 text-xs text-muted-foreground">
          <span>
            {banners.length.toLocaleString()} upcoming banner{banners.length === 1 ? '' : 's'}
          </span>
          {filtersActive ? (
            <Button size="xs" variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>

        <Command shouldFilter={false} className="min-h-0 flex-1 rounded-none">
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Search banners, characters, or cards…"
          />
          <CommandList className="max-h-[56vh] [&_[cmdk-list-sizer]]:gap-x-2 sm:[&_[cmdk-list-sizer]]:grid sm:[&_[cmdk-list-sizer]]:grid-cols-2">
            <CommandEmpty className="sm:col-span-2">
              <div className="flex flex-col items-center gap-3 py-2">
                <span>No future banners match these filters.</span>
                {filtersActive ? (
                  <Button size="sm" variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>
            {banners.map((event) => {
              const added = plannedIds.has(event.id);
              const kind = event.prediction?.kind;
              return (
                <CommandItem
                  key={event.id}
                  value={event.id}
                  onSelect={() => handleToggle(event.id)}
                  className={cn('items-start gap-3 py-2', added && 'bg-secondary/40')}
                  aria-label={`${resolveBannerLabel(event)}, ${added ? 'added — tap to remove' : 'tap to add'}`}
                >
                  <img
                    src={bannerImageUrl(event)}
                    alt=""
                    className="aspect-[9/6] w-24 shrink-0 rounded-lg object-contain"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{resolveBannerLabel(event)}</div>
                    <div className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {dateText(event.global_release_date)}
                      {windowSuffix(event)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline">{typeLabel(event.card_type)}</Badge>
                      <ConfidenceBadge kind={kind} />
                    </div>
                  </div>
                  {added ? (
                    <span className="ml-auto inline-flex shrink-0 items-center gap-1 self-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
                      <Check className="size-3" aria-hidden="true" />
                      Added
                    </span>
                  ) : null}
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>

        <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
          <span className="text-xs text-muted-foreground tabular-nums">
            {plannedIds.size.toLocaleString()} banner{plannedIds.size === 1 ? '' : 's'} in your plan
          </span>
          <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
