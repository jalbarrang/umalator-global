import { useCallback, useMemo, useRef, useState } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '../ui/button';
import './BasinnChart.css';
import { TableSearchBar } from './TableSearchBar';
import { useTableSearch } from './hooks/useTableSearch';
import type {
  CellContext,
  Column,
  ColumnDef,
  HeaderGroup,
  Row,
  SortingState,
  Table,
} from '@tanstack/react-table';
import type { SkillComparisonRoundResult } from '@/modules/simulation/types';

import { getSkillNameById, skillCollection } from '@/modules/data/skills';
import { groups_filters } from '@/modules/skills/filters';
import { iconIdPrefixes } from '@/modules/skills/icons';
import i18n from '@/i18n';
import { getIconUrl } from '@/assets/icons';
import { cn } from '@/lib/utils';
import { BassinTableBody, BASSIN_DATA_EVENT_OPEN_SKILL_ACTIONS } from './bassin-table-body';
import { Menu as MenuPrimitive } from '@base-ui/react/menu';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';
import {
  BASSIN_DATA_EVENT_TOGGLE_ACTIVATION_DETAILS,
  SkillActivationDetailsDialog,
} from './skill-activation-details-dialog';
import { BASSIN_DATA_EVENT_TOGGLE_SKILL_DETAILS, skillNameCell } from './skill-name-cell';
import { Popover, PopoverContent } from '../ui/popover';
import { ExpandedSkillDetails } from '@/modules/skills/components/ExpandedSkillDetails';
import React from 'react';

export const formatBasinn = React.memo(
  (props: CellContext<SkillComparisonRoundResult, unknown>) => {
    const value = props.getValue() as number;

    return value.toFixed(2).replace('-0.00', '0.00') + ' L';
  },
);

type IconTypeFilterKey = keyof typeof iconIdPrefixes;

type IconTypeFilterBarProps = {
  iconTypeFilters: Record<IconTypeFilterKey, boolean>;
  onToggle: (iconType: IconTypeFilterKey) => void;
};

type IconTypeFilterButtonProps = {
  iconType: IconTypeFilterKey;
  iconTypeFilters: Record<IconTypeFilterKey, boolean>;
  onToggle: (iconType: IconTypeFilterKey) => void;
};

const IconTypeFilterButton = React.memo(
  ({ iconType, iconTypeFilters, onToggle }: IconTypeFilterButtonProps) => {
    const handleClick = useCallback(() => {
      onToggle(iconType as IconTypeFilterKey);
    }, [iconType, onToggle]);

    const classNameObject = useMemo(() => {
      return cn('border rounded-none', {
        'border-primary': iconTypeFilters[iconType as IconTypeFilterKey],
      });
    }, [iconTypeFilters, iconType]);

    const imgSrc = useMemo(() => {
      return getIconUrl(`${iconType}1.png`);
    }, [iconType]);

    return (
      <Button
        key={iconType}
        variant="ghost"
        size="icon"
        className={classNameObject}
        onClick={handleClick}
        title={`Filter by icon type ${iconType}`}
      >
        <img src={imgSrc} className="w-6 h-6" />
      </Button>
    );
  },
);

const IconTypeFilterBar = React.memo(({ iconTypeFilters, onToggle }: IconTypeFilterBarProps) => {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {groups_filters.icontype.map((iconType) => (
        <IconTypeFilterButton
          key={iconType}
          iconType={iconType as IconTypeFilterKey}
          iconTypeFilters={iconTypeFilters}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
});

const sortableHeader = (name: string, _key: string) => {
  return React.memo(({ column }: { column: Column<SkillComparisonRoundResult> }) => {
    const isSorted = useMemo(() => column.getIsSorted(), [column]);

    const handleClick = useCallback(() => {
      if (!isSorted) {
        // If not sorted, sort by descending by default.
        column.toggleSorting(true);
        return;
      }

      column.toggleSorting(isSorted === 'asc');
    }, [column, isSorted]);

    return (
      <Button variant="ghost" onClick={handleClick} className="cursor-pointer p-0">
        {name}

        {isSorted === 'asc' && <ArrowUp />}
        {isSorted === 'desc' && <ArrowDown />}
        {isSorted === false && <ArrowUpDown />}
      </Button>
    );
  });
};

type BasinnChartProps = {
  data: Array<SkillComparisonRoundResult>;
  hiddenSkills: Array<string>;
  showUmaIcons?: boolean;
  selectedSkills: Array<string>;
  isSimulationRunning: boolean;
  courseDistance?: number;
  currentSeed?: number | null;
  skillLoadingStates?: Record<string, boolean>;
  onAddSkill: (id: string) => void;
  onSelectionChange: (id: string) => void;
  onReplaceOutfit?: (id: string) => void;
  onRunAdditionalSamples?: (skillId: string, additionalSamples: number) => void;
  className?: string;
};

export const gridClass = 'grid grid-cols-[50px_50px_1fr_100px_100px_100px_100px] w-full';

const SORTABLE_HEADER_IDS = new Set(['min', 'max', 'mean', 'median']);

type BassinTableHeaderRowProps = {
  headerGroup: HeaderGroup<SkillComparisonRoundResult>;
};

const BassinTableHeaderRow = React.memo(({ headerGroup }: BassinTableHeaderRowProps) => {
  return (
    <div className={cn('bg-card hover:bg-muted p-2', gridClass)}>
      {headerGroup.headers.map((header) => (
        <div
          key={header.id}
          className={cn('flex items-center gap-2', {
            'cursor-pointer': SORTABLE_HEADER_IDS.has(header.id),
          })}
        >
          {header.isPlaceholder
            ? null
            : flexRender(header.column.columnDef.header, header.getContext())}
        </div>
      ))}
    </div>
  );
});

type BassinTableHeaderProps = {
  table: Table<SkillComparisonRoundResult>;
};

function BassinTableHeader({ table }: BassinTableHeaderProps) {
  return (
    <>
      {table.getHeaderGroups().map((headerGroup) => (
        <BassinTableHeaderRow key={headerGroup.id} headerGroup={headerGroup} />
      ))}
    </>
  );
}

function isSkillActionsMenuAllowedCloseReason(
  reason: MenuPrimitive.Root.ChangeEventDetails['reason'],
): boolean {
  return reason === 'outside-press' || reason === 'item-press';
}

export const BasinnChart = React.memo((props: BasinnChartProps) => {
  const {
    selectedSkills,
    onAddSkill,
    showUmaIcons = false,
    onReplaceOutfit,
    isSimulationRunning,
    currentSeed = null,
    skillLoadingStates = {},
    onRunAdditionalSamples,
    className,
  } = props;

  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [skillActionsAnchor, setSkillActionsAnchor] = useState<{
    skillId: string;
    element: Element;
  } | null>(null);
  const [skillDetailsAnchor, setSkillDetailsAnchor] = useState<{
    skillId: string;
    element: Element;
  } | null>(null);
  const [showSkillIds, setShowSkillIds] = useState(false);
  const [iconTypeFilters, setIconTypeFilters] = useState<Record<IconTypeFilterKey, boolean>>(() => {
    const initialState = {} as Record<IconTypeFilterKey, boolean>;

    for (const iconType of groups_filters.icontype) {
      initialState[iconType as IconTypeFilterKey] = true;
    }

    return initialState;
  });

  const skillMetadataById = useMemo(() => {
    return new Map(props.data.map((row) => [row.id, skillCollection[row.id]]));
  }, [props.data]);

  const activeIconTypeFilters = useMemo(() => {
    return groups_filters.icontype.filter(
      (iconType) => iconTypeFilters[iconType as IconTypeFilterKey],
    );
  }, [iconTypeFilters]);

  const filteredData = useMemo(() => {
    return props.data.filter((row) => {
      const skill = skillMetadataById.get(row.id);
      if (!skill) return true;

      return activeIconTypeFilters.some((iconType) =>
        iconIdPrefixes[iconType as IconTypeFilterKey]?.some((prefix) =>
          skill.iconId.startsWith(prefix),
        ),
      );
    });
  }, [activeIconTypeFilters, props.data, skillMetadataById]);

  const handleGridClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const actionsEl = (e.target as HTMLElement).closest(
        `[data-event="${BASSIN_DATA_EVENT_OPEN_SKILL_ACTIONS}"]`,
      );
      if (actionsEl) {
        const skillId = actionsEl.getAttribute('data-skill-id');
        if (!skillId) return;
        if (!onReplaceOutfit) {
          onAddSkill(skillId);
          return;
        }
        setSkillActionsAnchor({ skillId, element: actionsEl });
        return;
      }

      const detailsEl = (e.target as HTMLElement).closest(
        `[data-event="${BASSIN_DATA_EVENT_TOGGLE_SKILL_DETAILS}"]`,
      );
      if (detailsEl) {
        const skillId = detailsEl.getAttribute('data-skill-id');
        if (!skillId) return;
        setSkillDetailsAnchor((prev) => {
          if (prev?.skillId === skillId) return null;
          return { skillId, element: detailsEl };
        });
        return;
      }

      const el = (e.target as HTMLElement).closest(
        `[data-event="${BASSIN_DATA_EVENT_TOGGLE_ACTIVATION_DETAILS}"]`,
      );
      if (!el) return;

      const skillId = el.getAttribute('data-skill-id');
      if (!skillId) return;

      setExpandedSkillId((prev) => (prev === skillId ? null : skillId));
    },
    [onAddSkill, onReplaceOutfit],
  );

  const activationDetailsRow = useMemo(() => {
    if (!expandedSkillId) return null;
    return filteredData.find((r) => r.id === expandedSkillId) ?? null;
  }, [expandedSkillId, filteredData]);

  const activationDetailsDialogOpen =
    expandedSkillId !== null && activationDetailsRow?.runData != null;

  const handleToggleIconTypeFilter = useCallback((iconType: IconTypeFilterKey) => {
    setIconTypeFilters((prev) => {
      const allActive = groups_filters.icontype.every(
        (filter) => prev[filter as IconTypeFilterKey],
      );

      if (allActive) {
        const nextState = {} as Record<IconTypeFilterKey, boolean>;
        for (const filter of groups_filters.icontype) {
          nextState[filter as IconTypeFilterKey] = filter === iconType;
        }
        return nextState;
      }

      const toggledState = {
        ...prev,
        [iconType]: !prev[iconType],
      };

      const anyActive = groups_filters.icontype.some(
        (filter) => toggledState[filter as IconTypeFilterKey],
      );

      if (!anyActive) {
        for (const filter of groups_filters.icontype) {
          toggledState[filter as IconTypeFilterKey] = true;
        }
      }

      return toggledState;
    });
  }, []);

  const columns: Array<ColumnDef<SkillComparisonRoundResult>> = useMemo(() => {
    return [
      {
        id: 'actions',
        header: '',
        cell: () => null,
        enableSorting: false,
      },
      {
        id: 'expand',
        header: '',
        cell: () => null,
        enableSorting: false,
      },
      {
        header: () => <span>Skill name</span>,
        accessorKey: 'id',
        cell: skillNameCell({
          showUmaIcons,
          showSkillIds,
          skillMetadataById,
        }),
        sortingFn: (a, b, _) => {
          const skillIdA = a.getValue('id');
          const skillIdB = b.getValue('id');

          const skillNameA = getSkillNameById(`${skillIdA}`);
          const skillNameB = getSkillNameById(`${skillIdB}`);

          return skillNameA < skillNameB ? -1 : 1;
        },
      },
      {
        header: sortableHeader('Minimum', 'min'),
        accessorKey: 'min',
        cell: formatBasinn,
      },
      {
        header: sortableHeader('Maximum', 'max'),
        accessorKey: 'max',
        cell: formatBasinn,
        sortDescFirst: true,
      },
      {
        header: sortableHeader('Mean', 'mean'),
        accessorKey: 'mean',
        cell: formatBasinn,
        sortDescFirst: true,
      },
      {
        header: sortableHeader('Median', 'median'),
        accessorKey: 'median',
        cell: formatBasinn,
        sortDescFirst: true,
      },
    ];
  }, [showUmaIcons, showSkillIds, skillMetadataById]);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'mean', desc: true }]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    columns,
    data: filteredData,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { sorting, rowSelection },
  });

  const { rows } = table.getRowModel();

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizerOptions = useMemo(
    () => ({
      count: rows.length,
      getScrollElement: () => parentRef.current,
      estimateSize: () => 50,
      overscan: 30,
      getItemKey: (index: number) => rows[index].id,
      measureElement:
        typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
          ? (element: Element) => element?.getBoundingClientRect().height
          : undefined,
    }),
    [rows],
  );

  const virtualizer = useVirtualizer(virtualizerOptions);

  // Search functionality
  const searchOptions = useMemo(
    () => ({
      rows,
      getSearchableText: (row: Row<SkillComparisonRoundResult>) => {
        const skillId: string = row.getValue('id');
        return i18n.t(`skillnames.${skillId}`);
      },
      onScrollToRow: (index: number) => {
        virtualizer.scrollToIndex(index, { align: 'center' });
      },
    }),
    [rows, virtualizer],
  );

  const search = useTableSearch(searchOptions);

  const handleToggleSkillIds = useCallback(() => {
    setShowSkillIds((prev) => !prev);
  }, []);

  const handleSkillActionsMenuOpenChange = useCallback(
    (open: boolean, eventDetails: MenuPrimitive.Root.ChangeEventDetails) => {
      if (!open) {
        if (!isSkillActionsMenuAllowedCloseReason(eventDetails.reason)) {
          eventDetails.cancel();
          return;
        }
        setSkillActionsAnchor(null);
      }
    },
    [],
  );

  return (
    <div className={cn('relative', className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <IconTypeFilterBar
          iconTypeFilters={iconTypeFilters}
          onToggle={handleToggleIconTypeFilter}
        />

        <Button variant="outline" size="sm" onClick={handleToggleSkillIds}>
          {showSkillIds ? 'Hide IDs' : 'Show IDs'}
        </Button>

        {activeIconTypeFilters.length < groups_filters.icontype.length && (
          <span className="text-sm text-muted-foreground">
            Showing {filteredData.length} / {props.data.length} skills
          </span>
        )}
      </div>

      {/* Search Bar */}
      <TableSearchBar
        isOpen={search.isSearchOpen}
        searchQuery={search.searchQuery}
        onSearchChange={search.setSearchQuery}
        onClose={search.closeSearch}
        onNext={search.goToNextMatch}
        onPrevious={search.goToPreviousMatch}
        currentMatchIndex={search.currentMatchIndex}
        totalMatches={search.matches.length}
        hasMatches={search.hasMatches}
        searchInputRef={search.searchInputRef}
      />

      {/* Table Container */}
      <div
        ref={parentRef}
        className="overflow-auto relative min-h-[600px] max-h-[700px]"
        onClick={handleGridClick}
      >
        {/* Table */}
        <div className="min-w-[900px] w-full text-sm">
          {/* Table Header */}
          <div className="sticky top-0 z-30">
            <BassinTableHeader table={table} />
          </div>

          {/* Table Body */}
          <BassinTableBody
            virtualizer={virtualizer}
            rows={rows}
            selectedSkills={selectedSkills}
            expandedSkillId={expandedSkillId}
            search={search}
            hiddenSkills={props.hiddenSkills}
            isSimulationRunning={isSimulationRunning}
          />
        </div>
      </div>

      <SkillActivationDetailsDialog
        open={activationDetailsDialogOpen}
        onOpenChange={(open) => {
          if (!open) setExpandedSkillId(null);
        }}
        skillRow={activationDetailsRow}
        courseDistance={props.courseDistance ?? 1400}
        currentSeed={currentSeed}
        isGlobalSimulationRunning={isSimulationRunning}
        skillLoading={
          expandedSkillId != null ? (skillLoadingStates[expandedSkillId] ?? false) : false
        }
        onRunAdditionalSamples={onRunAdditionalSamples}
      />

      <Popover
        open={skillDetailsAnchor !== null}
        onOpenChange={(open) => {
          if (!open) setSkillDetailsAnchor(null);
        }}
      >
        <PopoverContent
          align="start"
          side="right"
          className="w-[420px] p-0"
          anchor={skillDetailsAnchor?.element ?? null}
        >
          {skillDetailsAnchor &&
            (() => {
              const skill = skillCollection[skillDetailsAnchor.skillId];
              if (!skill) {
                return (
                  <div className="p-3 text-sm text-muted-foreground">
                    Unknown skill {skillDetailsAnchor.skillId}
                  </div>
                );
              }
              return (
                <ExpandedSkillDetails
                  id={skillDetailsAnchor.skillId}
                  skill={skill}
                  distanceFactor={props.courseDistance}
                />
              );
            })()}
        </PopoverContent>
      </Popover>

      {onReplaceOutfit && (
        <DropdownMenu
          open={skillActionsAnchor !== null}
          onOpenChange={handleSkillActionsMenuOpenChange}
        >
          <DropdownMenuContent align="start" anchor={skillActionsAnchor?.element ?? null}>
            <DropdownMenuItem
              onClick={() => {
                if (!skillActionsAnchor) return;
                onAddSkill(skillActionsAnchor.skillId);
                setSkillActionsAnchor(null);
              }}
            >
              Add Skill to Runner
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                if (!skillActionsAnchor) return;
                onReplaceOutfit(skillActionsAnchor.skillId);
                setSkillActionsAnchor(null);
              }}
            >
              Replace Runner Outfit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
});
