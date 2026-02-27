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
import { ActivationDetails } from './activation-details';
import type { CellContext, Column, ColumnDef, Row, SortingState } from '@tanstack/react-table';
import type { PoolMetrics, SkillComparisonRoundResult } from '@/modules/simulation/types';
import icons from '@/modules/data/icons.json';
import umas from '@/modules/data/umas.json';

import { allSkills, getSkillNameById } from '@/modules/skills/utils';
import { formatMs } from '@/utils/time';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';

function umaForUniqueSkill(skillId: string): string | null {
  const sid = parseInt(skillId);
  if (sid < 100000 || sid >= 200000) return null;

  const remainder = sid - 100001;
  if (remainder < 0) return null;

  const i = Math.floor(remainder / 10) % 1000;
  const v = Math.floor(remainder / 10 / 1000) + 1;

  const umaId = i.toString().padStart(3, '0');
  const baseUmaId = `1${umaId}`;
  const outfitId = `${baseUmaId}${v.toString().padStart(2, '0')}`;
  const uma = umas[baseUmaId as keyof typeof umas];

  if (uma?.outfits[outfitId as keyof typeof uma.outfits]) {
    return outfitId;
  }

  return null;
}

const formatBasinn = (props: CellContext<SkillComparisonRoundResult, unknown>) => {
  const value = props.getValue() as number;

  return value.toFixed(2).replace('-0.00', '0.00') + ' L';
};

const skillNameCell =
  (showUmaIcons: boolean = false) =>
  (props: CellContext<SkillComparisonRoundResult, unknown>) => {
    const id = props.getValue() as string;

    const skill = allSkills.find((currSkill) => currSkill.originalId === id);

    if (showUmaIcons) {
      const umaId = umaForUniqueSkill(id);

      if (umaId && icons[umaId as keyof typeof icons]) {
        const icon = icons[umaId as keyof typeof icons];

        return (
          <>
            {/* className="flex items-center gap-2" data-itemtype="uma" data-itemid={umaId} */}
            <img src={icon} className="w-8 h-8" />
            <span>
              {i18n.t(`skillnames.${id}`)} ({id})
            </span>
          </>
        );
      }
    }

    if (!skill) {
      return (
        // <div className="flex items-center gap-2" data-itemtype="skill" data-itemid={id}>
        <span>
          {i18n.t(`skillnames.${id}`)} ({id})
        </span>
        // </div>
      );
    }

    return (
      // <div className="flex items-center gap-2" data-itemtype="skill" data-itemid={id}>
      <>
        <img src={`/icons/${skill.iconId}.png`} className="w-4 h-4" />
        <span>
          {i18n.t(`skillnames.${id}`)} ({id})
        </span>
      </>
      // </div>
    );
  };

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

const gridClass = 'grid grid-cols-[50px_50px_1fr_100px_100px_100px_100px] w-full';

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
        cell: skillNameCell(showUmaIcons),
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
  }, [showUmaIcons, expandedRows, selectedSkills]);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'mean', desc: true }]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    columns,
    data: props.data,
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
          <div
            className="relative"
            style={{
              height: `${virtualizer.getTotalSize()}px`,
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow, _index) => {
              const row = rows[virtualRow.index];

              const id: string = row.getValue('id');
              const isSelected = selectedSkills.includes(id);
              const isExpanded = expandedRows.has(id);
              const rowData = props.data.find((d) => d.id === id);
              const hasRunData = rowData?.runData != null;
              const isSearchMatch = search.matches.includes(virtualRow.index);
              const isCurrentMatch = search.matches[search.currentMatchIndex] === virtualRow.index;

              return (
                <div
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={(node) => virtualizer.measureElement(node)}
                  className={cn(
                    'w-full bg-background hover:bg-muted p-2 border-b last-of-type:border-b-0',
                    'flex flex-col gap-2',
                    {
                      hidden: props.hiddenSkills.includes(id),
                      'bg-primary/5': isSelected && !isSearchMatch,
                      'bg-yellow-100/50 dark:bg-yellow-900/20': isSearchMatch && !isCurrentMatch,
                      'bg-yellow-200/70 dark:bg-yellow-800/40': isCurrentMatch,
                    },
                  )}
                  style={{
                    position: 'absolute',
                    transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
                  }}
                >
                  <div className={gridClass}>
                    {row.getVisibleCells().map((cell) => {
                      const column = cell.column;
                      const columnId = column.id;
                      const cellValue = cell.getValue();
                      const extraProps: Record<string, unknown> = {};

                      if (columnId === 'id') {
                        extraProps['data-itemtype'] = 'skill';
                        extraProps['data-itemid'] = cellValue;
                      }

                      return (
                        <div key={cell.id} className="flex items-center gap-2" {...extraProps}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    })}
                  </div>

                  {isExpanded && hasRunData && rowData?.runData && (
                    <ActivationDetails
                      skillId={id}
                      runData={rowData.runData}
                      skillActivations={rowData.skillActivations}
                      courseDistance={props.courseDistance ?? 1400}
                      currentSeed={currentSeed}
                      isGlobalSimulationRunning={isSimulationRunning}
                      isSkillLoading={skillLoadingStates[id] ?? false}
                      onRunAdditionalSamples={onRunAdditionalSamples}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
