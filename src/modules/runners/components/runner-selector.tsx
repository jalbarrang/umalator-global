import {
  type ChangeEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useReducer,
  useRef
} from 'react';
import { FilterIcon, SearchIcon } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UpcomingToggle } from '@/components/upcoming-toggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useGridKeyboardNavigation } from '@/hooks/use-grid-keyboard-navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { UmaQuery, type UmaAptitudeFilters, type UmaAptitudeKey } from '@/modules/runners/query';
import { encodingToAptitude } from '@/modules/runners/share/converters';
import { getUmaDisplayInfo, getUmaImageUrl, useUmasForSearch } from '@/modules/runners/utils';
import { useUIStore } from '@/store/ui.store';

const ROW_HEIGHT = 108;
const VIRTUAL_OVERSCAN = 3;
const MIN_GRADES = [8, 7, 6, 5, 4, 3, 2, 1] as const;

const APTITUDE_ROWS: Array<{
  label: string;
  slots: Array<{ key: UmaAptitudeKey; name: string }>;
}> = [
  {
    label: 'Track',
    slots: [
      { key: 'turf', name: 'Turf' },
      { key: 'dirt', name: 'Dirt' }
    ]
  },
  {
    label: 'Distance',
    slots: [
      { key: 'sprint', name: 'Sprint' },
      { key: 'mile', name: 'Mile' },
      { key: 'medium', name: 'Medium' },
      { key: 'long', name: 'Long' }
    ]
  },
  {
    label: 'Style',
    slots: [
      { key: 'frontRunner', name: 'Front Runner' },
      { key: 'paceChaser', name: 'Pace Chaser' },
      { key: 'lateSurger', name: 'Late Surger' },
      { key: 'endCloser', name: 'End Closer' }
    ]
  }
];

type UmaSelectorProps = {
  value: string;
  select: (outfitId: string) => void;
  onReset?: () => void;
  onImport?: () => void;
  randomMobId?: number;
};

type AptitudeFilterGridProps = {
  filters: UmaAptitudeFilters;
  onChange: (key: UmaAptitudeKey, value: number | null) => void;
};

type UmaSelectorUiState = {
  open: boolean;
  selectedOutfitId: string;
  filtersOpen: boolean;
  search: string;
  aptitudeFilters: UmaAptitudeFilters;
  scrollElement: HTMLDivElement | null;
};

type UmaSelectorAction =
  | { type: 'dialog:openChange'; open: boolean; selectedOutfitId?: string }
  | { type: 'uma:select'; outfitId: string }
  | { type: 'search:set'; value: string }
  | { type: 'filters:openChange'; open: boolean }
  | { type: 'filters:aptitude:set'; key: UmaAptitudeKey; value: number | null }
  | { type: 'scroll:set'; element: HTMLDivElement | null };

function createInitialUmaSelectorState(value: string): UmaSelectorUiState {
  return {
    open: false,
    selectedOutfitId: value,
    filtersOpen: false,
    search: '',
    aptitudeFilters: {},
    scrollElement: null
  };
}

function umaSelectorReducer(state: UmaSelectorUiState, action: UmaSelectorAction): UmaSelectorUiState {
  switch (action.type) {
    case 'dialog:openChange':
      return {
        ...state,
        open: action.open,
        ...(action.selectedOutfitId !== undefined
          ? { selectedOutfitId: action.selectedOutfitId }
          : {})
      };
    case 'uma:select':
      return {
        ...state,
        open: false,
        search: '',
        selectedOutfitId: action.outfitId
      };
    case 'search:set':
      return {
        ...state,
        search: action.value
      };
    case 'filters:openChange':
      return {
        ...state,
        filtersOpen: action.open
      };
    case 'filters:aptitude:set': {
      const next = { ...state.aptitudeFilters };

      if (action.value == null) {
        delete next[action.key];
      } else {
        next[action.key] = action.value;
      }

      return {
        ...state,
        aptitudeFilters: next
      };
    }
    case 'scroll:set':
      return {
        ...state,
        scrollElement: action.element
      };
  }
}

const AptitudeFilterGrid = (props: AptitudeFilterGridProps) => {
  const { filters, onChange } = props;

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2">
      {APTITUDE_ROWS.map((row) => (
        <div key={row.label} className="flex flex-col gap-1 md:flex-row md:items-center md:gap-2">
          <span className="text-xs w-[52px] text-muted-foreground">{row.label}:</span>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {row.slots.map((slot) => (
              <div key={slot.key} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-[76px] truncate">{slot.name}</span>

                <Select
                  value={filters[slot.key] == null ? 'any' : String(filters[slot.key])}
                  onValueChange={(newValue) => {
                    onChange(slot.key, newValue === 'any' ? null : Number(newValue));
                  }}
                >
                  <SelectTrigger size="sm" className="w-auto min-w-18 gap-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent className="text-xs">
                    <SelectItem value="any">All</SelectItem>

                    {MIN_GRADES.map((grade) => (
                      <SelectItem key={grade} value={String(grade)}>
                        {encodingToAptitude(grade)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export const UmaSelector = (props: UmaSelectorProps) => {
  const { value, randomMobId, select } = props;
  const [state, dispatch] = useReducer(
    umaSelectorReducer,
    value,
    createInitialUmaSelectorState
  );
  const { open, selectedOutfitId, filtersOpen, search, aptitudeFilters, scrollElement } = state;
  const deferredSearch = useDeferredValue(search);
  const searchRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const columns = isMobile ? 3 : 4;
  const showUpcoming = useUIStore((state) => state.showUpcoming);
  const umasForSearch = useUmasForSearch(true);

  const imageUrl = useMemo(() => getUmaImageUrl(value, randomMobId), [value, randomMobId]);

  const selectedUma = useMemo(() => {
    if (!value) {
      return null;
    }

    return getUmaDisplayInfo(value);
  }, [value]);

  const filteredUmas = useMemo(() => {
    return UmaQuery.from(umasForSearch)
      .whereIsUpcoming(showUpcoming)
      .whereText(deferredSearch)
      .whereAptitudes(aptitudeFilters)
      .execute();
  }, [aptitudeFilters, deferredSearch, showUpcoming, umasForSearch]);

  const activeAptitudeFilterCount = useMemo(() => {
    return Object.values(aptitudeFilters).filter((value) => value != null).length;
  }, [aptitudeFilters]);

  const filteredUmaCount = filteredUmas.length;
  const rowCount = Math.ceil(filteredUmaCount / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    enabled: open && scrollElement !== null,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  });
  const rowVirtualizerRef = useRef(rowVirtualizer);

  useEffect(() => {
    rowVirtualizerRef.current = rowVirtualizer;
  }, [rowVirtualizer]);

  const selectFocusedUma = useCallback(
    (index: number) => {
      const uma = filteredUmas[index];
      if (!uma) {
        return;
      }

      dispatch({ type: 'uma:select', outfitId: uma.id });
      select(uma.id);
    },
    [filteredUmas, select]
  );

  const {
    focusedIndex,
    isBrowsing,
    handleSearchKeyDown,
    reset: resetKeyboardNavigation,
    resetBrowsing,
    setFocusedIndex: handleHighlightUma
  } = useGridKeyboardNavigation({
    itemCount: filteredUmaCount,
    columnCount: columns,
    rowCount,
    scrollToRow: (rowIndex) => {
      rowVirtualizerRef.current.scrollToIndex(rowIndex, { align: 'auto' });
    },
    onSelectFocused: selectFocusedUma
  });

  const handleOpenChange = (isOpen: boolean) => {
    dispatch({
      type: 'dialog:openChange',
      open: isOpen,
      selectedOutfitId: isOpen ? value : undefined
    });

    if (isOpen) {
      const selectedIndex = filteredUmas.findIndex((uma) => uma.id === value);

      resetKeyboardNavigation(Math.max(0, selectedIndex));
    }
  };

  const handleSelectedItem = (outfitId: string) => {
    dispatch({ type: 'uma:select', outfitId });
    select(outfitId);
  };

  const resetScroll = () => {
    if (scrollElement) {
      scrollElement.scrollTop = 0;
    }
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    resetBrowsing();
    dispatch({ type: 'search:set', value: event.target.value });
    resetScroll();
  };

  const handleAptitudeFilterChange = (key: UmaAptitudeKey, filterValue: number | null) => {
    resetBrowsing();
    dispatch({ type: 'filters:aptitude:set', key, value: filterValue });
    resetScroll();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger className="flex flex-1 gap-2 cursor-pointer">
        <div className="size-18">
          <img src={imageUrl} alt={selectedUma?.name || 'Runner'} />
        </div>

        {selectedUma && (
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs font-bold">{selectedUma.outfit}</div>
            <div className="text-sm">{selectedUma.name}</div>
          </div>
        )}

        {!selectedUma && (
          <div className="flex flex-col items-center justify-center">
            <div className="text-sm text-muted-foreground">Click me to select a runner</div>
          </div>
        )}
      </DialogTrigger>

      <DialogContent className="flex flex-col h-dvh md:h-[90dvh] min-h-0 max-w-full md:max-w-[680px]!">
        <DialogHeader>
          <DialogTitle>Select Runner</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-1">
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon className="size-4" />
            </InputGroupAddon>

            <InputGroupInput
              ref={searchRef}
              placeholder="Search runner..."
              value={search}
              onChange={handleSearchChange}
              onPointerDown={resetBrowsing}
              onKeyDown={handleSearchKeyDown}
            />
          </InputGroup>

          <Collapsible
            open={filtersOpen}
            onOpenChange={(nextOpen) => dispatch({ type: 'filters:openChange', open: nextOpen })}
          >
            <div className="flex items-center justify-between gap-2">
              <UpcomingToggle />

              <CollapsibleTrigger
                render={
                  <Button type="button" variant="outline" size="sm">
                    <FilterIcon className="size-3.5" />
                    Aptitudes
                    {activeAptitudeFilterCount > 0 && (
                      <Badge variant="secondary">{activeAptitudeFilterCount}</Badge>
                    )}
                  </Button>
                }
              />
            </div>

            <CollapsibleContent>
              <AptitudeFilterGrid filters={aptitudeFilters} onChange={handleAptitudeFilterChange} />
            </CollapsibleContent>
          </Collapsible>
        </div>

        {filteredUmas.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            No results found.
          </div>
        ) : (
          <div ref={(element) => dispatch({ type: 'scroll:set', element })} className="flex-1 min-h-0 overflow-y-auto">
            <div style={{ height: rowVirtualizer.getTotalSize() }} className="relative w-full">
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowStart = virtualRow.index * columns;
                const rowUmas = filteredUmas.slice(rowStart, rowStart + columns);

                if (rowUmas.length === 0) {
                  return null;
                }

                return (
                  <div
                    key={virtualRow.key}
                    className="absolute top-0 left-0 w-full px-1"
                    style={{ transform: `translateY(${virtualRow.start}px)` }}
                  >
                    <div
                      className="grid gap-1"
                      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
                    >
                      {rowUmas.map((uma, columnIndex) => {
                        const umaIndex = rowStart + columnIndex;
                        const isSelected = uma.id === selectedOutfitId;
                        const isFocused = isBrowsing && umaIndex === focusedIndex;

                        return (
                          <button
                            key={uma.id}
                            type="button"
                            aria-current={isSelected ? 'true' : undefined}
                            data-highlighted={isFocused ? 'true' : undefined}
                            onClick={() => handleSelectedItem(uma.id)}
                            onPointerEnter={() => handleHighlightUma(umaIndex)}
                            className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-accent aria-current:bg-accent data-[highlighted=true]:bg-accent cursor-pointer transition-colors"
                          >
                            <img
                              src={getUmaImageUrl(uma.id)}
                              className="size-16 rounded"
                              alt={uma.name}
                            />
                            <div className="text-center w-full min-w-0">
                              <div className="text-[10px] font-bold leading-tight truncate">
                                {uma.outfit}
                              </div>
                              <div className="text-xs leading-tight truncate">{uma.name}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {columns > 1 ? (
          <div className="px-2 pb-1 text-xs text-muted-foreground">
            ↑/↓ move between rows, ←/→ move between columns, Enter selects, Esc returns to search.
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
