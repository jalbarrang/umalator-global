import { useCallback, useMemo, useRef, useState } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import './BasinnChart.css';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { TableSearchBar } from './TableSearchBar';
import { useTableSearch } from './hooks/useTableSearch';
import type { CellContext, Column, ColumnDef, Row, SortingState } from '@tanstack/react-table';
import type { PoolMetrics, SkillComparisonRoundResult } from '@/modules/simulation/types';

import { getSkillById, getSkillNameById } from '@/modules/skills/utils';
import { groups_filters } from '@/modules/skills/filters';
import { iconIdPrefixes } from '@/modules/skills/icons';
import { formatMs } from '@/utils/time';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';
import { BassinTableBody } from './bassin-table-body';
import { skillNameCell } from './skill-name-cell';

const formatBasinn = (props: CellContext<SkillComparisonRoundResult, unknown>) => {
  const value = props.getValue() as number;

  return value.toFixed(2).replace('-0.00', '0.00') + ' L';
};

type IconTypeFilterKey = keyof typeof iconIdPrefixes;

const sortableHeader =
  (name: string, _key: string) =>
  ({ column }: { column: Column<SkillComparisonRoundResult> }) => {
    const isSorted = column.getIsSorted();

    const handleClick = () => {
      if (!isSorted) {
        // If not sorted, sort by descending by default.
        column.toggleSorting(true);
        return;
      }

      column.toggleSorting(isSorted === 'asc');
    };

    return (
      <Button variant="ghost" onClick={handleClick} className="cursor-pointer p-0">
        {name}

        {isSorted === 'asc' && <ArrowUp />}
        {isSorted === 'desc' && <ArrowDown />}
        {isSorted === false && <ArrowUpDown />}
      </Button>
    );
  };

type BasinnChartProps = {
  data: Array<SkillComparisonRoundResult>;
  hiddenSkills: Array<string>;
  showUmaIcons?: boolean;
  metrics?: PoolMetrics | null;
  selectedSkills: Array<string>;
  isSimulationRunning: boolean;
  courseDistance?: number;
  currentSeed?: number | null;
  skillLoadingStates?: Record<string, boolean>;
  onAddSkill: (id: string) => void;
  onSelectionChange: (id: string) => void;
  onReplaceOutfit?: (id: string) => void;
  onRunAdditionalSamples?: (skillId: string, additionalSamples: number) => void;
};

export const gridClass = 'grid grid-cols-[50px_50px_1fr_100px_100px_100px_100px] w-full';

export const BasinnChart = (props: BasinnChartProps) => {
  const {
    selectedSkills,
    onAddSkill,
    metrics,
    showUmaIcons = false,
    onReplaceOutfit,
    isSimulationRunning,
    currentSeed = null,
    skillLoadingStates = {},
    onRunAdditionalSamples,
  } = props;

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [showSkillIds, setShowSkillIds] = useState(false);
  const [iconTypeFilters, setIconTypeFilters] = useState<Record<IconTypeFilterKey, boolean>>(() => {
    const initialState = {} as Record<IconTypeFilterKey, boolean>;
    for (const iconType of groups_filters.icontype) {
      initialState[iconType as IconTypeFilterKey] = true;
    }
    return initialState;
  });

  const skillMetadataById = useMemo(() => {
    return new Map(props.data.map((row) => [row.id, getSkillById(row.id)]));
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

  const handleToggleRow = useCallback((skillId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  }, []);

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
        cell: (info: CellContext<SkillComparisonRoundResult, unknown>) => {
          const skillId: string = info.row.getValue('id');

          const handleClick = () => {
            onAddSkill(skillId);
          };

          const handleReplaceOutfit = () => {
            onReplaceOutfit?.(skillId);
          };

          if (!onReplaceOutfit) {
            return (
              <Button variant="outline" size="sm" onClick={handleClick} className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            );
          }

          return (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={handleClick}>Add Skill to Runner</DropdownMenuItem>
                <DropdownMenuItem onClick={handleReplaceOutfit}>
                  Replace Runner Outfit
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
      },
      {
        id: 'expand',
        header: '',
        cell: (info: CellContext<SkillComparisonRoundResult, unknown>) => {
          const row = info.row.original;
          const skillId = row.id;
          const hasRunData = row.runData != null;
          const isExpanded = expandedRows.has(skillId);

          if (!hasRunData) {
            return <div className="w-8" />;
          }

          return (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleRow(skillId);
              }}
              title={isExpanded ? 'Collapse details' : 'Show activation details'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          );
        },
        enableSorting: false,
      },
      {
        header: () => <span>Skill name</span>,
        accessorKey: 'id',
        cell: skillNameCell({
          showUmaIcons,
          showSkillIds,
          skillMetadataById,
          courseDistance: props.courseDistance,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showUmaIcons, showSkillIds, skillMetadataById, expandedRows, selectedSkills]);

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

  return (
    <div className="relative">
      {/* Loading Overlay */}
      {isSimulationRunning && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
          <div className="flex flex-col items-center gap-4 p-8 bg-card border rounded-lg shadow-lg min-w-[300px]">
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">Simulating Skills</div>
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          </div>
        </div>
      )}

      {/* Metrics Display */}
      {!isSimulationRunning && metrics && (
        <div className="mb-4 p-3 bg-muted/50 rounded-md border">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span>
              <strong>Time:</strong> {formatMs(metrics.timeTaken)}s
            </span>
            <span>
              <strong>Skills Processed:</strong> {metrics.skillsProcessed}
            </span>
          </div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          {groups_filters.icontype.map((iconType) => (
            <Button
              key={iconType}
              variant="ghost"
              size="icon"
              className={cn('border rounded-none', {
                'border-primary': iconTypeFilters[iconType as IconTypeFilterKey],
              })}
              onClick={() => handleToggleIconTypeFilter(iconType as IconTypeFilterKey)}
              title={`Filter by icon type ${iconType}`}
            >
              <img src={`/icons/${iconType}1.png`} className="w-6 h-6" />
            </Button>
          ))}
        </div>

        <Button variant="outline" size="sm" onClick={() => setShowSkillIds((prev) => !prev)}>
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
      <div ref={parentRef} className="overflow-auto relative h-[600px]">
        {/* Table */}
        <div className="w-full text-sm">
          {/* Table Header */}
          <div className="sticky top-0 z-30">
            {table.getHeaderGroups().map((headerGroup) => (
              <div key={headerGroup.id} className={cn('bg-card hover:bg-muted p-2', gridClass)}>
                {headerGroup.headers.map((header) => (
                  <div
                    key={header.id}
                    className={cn('flex items-center gap-2', {
                      'cursor-pointer': ['min', 'max', 'mean', 'median'].includes(header.id),
                    })}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Table Body */}
          <BassinTableBody
            virtualizer={virtualizer}
            rows={rows}
            selectedSkills={selectedSkills}
            expandedRows={expandedRows}
            search={search}
            hiddenSkills={props.hiddenSkills}
            courseDistance={props.courseDistance}
            currentSeed={currentSeed}
            isSimulationRunning={isSimulationRunning}
            skillLoadingStates={skillLoadingStates}
            onRunAdditionalSamples={onRunAdditionalSamples}
          />
        </div>
      </div>
    </div>
  );
};
