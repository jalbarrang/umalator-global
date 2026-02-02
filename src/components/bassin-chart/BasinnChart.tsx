import { useRef, useState } from 'react';

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
  Eye,
  EyeClosed,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import './BasinnChart.css';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { ActivationEffectChart } from './ActivationEffectChart';
import { TableSearchBar } from './TableSearchBar';
import { useTableSearch } from './hooks/useTableSearch';
import type { CellContext, Column, ColumnDef, SortingState } from '@tanstack/react-table';
import type { PoolMetrics, SkillComparisonRoundResult } from '@/modules/simulation/types';
import type { SkillSimulationData } from '@/modules/simulation/compare.types';
import icons from '@/modules/data/icons.json';
import umas from '@/modules/data/umas.json';
import skillnames from '@/modules/data/skillnames.json';

import { allSkills } from '@/modules/skills/utils';
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
            <span>{i18n.t(`skillnames.${id}`)}</span>
          </>
        );
      }
    }

    if (!skill) {
      return (
        // <div className="flex items-center gap-2" data-itemtype="skill" data-itemid={id}>
        <span>{i18n.t(`skillnames.${id}`)}</span>
        // </div>
      );
    }

    return (
      // <div className="flex items-center gap-2" data-itemtype="skill" data-itemid={id}>
      <>
        <img src={`/icons/${skill.meta.iconId}.png`} className="w-4 h-4" />
        <span>{i18n.t(`skillnames.${id}`)}</span>
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
  onAddSkill: (id: string) => void;
  onSelectionChange: (id: string) => void;
  onReplaceOutfit?: (id: string) => void;
};

// Component to show detailed activation info in expanded row
function ActivationDetails({
  skillId,
  runData,
  courseDistance,
}: {
  skillId: string;
  runData: SkillSimulationData;
  courseDistance: number;
}) {
  // Calculate position-based metrics (WHEN skills activate)
  const activationPositions: Array<number> = [];

  // Collect all activation positions
  const runTypes = ['minrun', 'maxrun', 'meanrun', 'medianrun'] as const;

  runTypes.forEach((runType) => {
    const run = runData[runType];

    // Only use the second uma index since the skill is always on uma2
    const skillMap = run?.sk[1];
    if (!skillMap) return;

    const activations = skillMap[skillId];
    if (!activations) return;

    activations.forEach((activation) => {
      activationPositions.push(activation.start);
    });
  });

  // Calculate position statistics
  const totalActivations = activationPositions.length;
  const hasActivations = totalActivations > 0;

  let earliestPosition = 0;
  let latestPosition = 0;
  let averagePosition = 0;
  let primaryPhase = '';

  if (hasActivations) {
    const sorted = activationPositions.sort((a, b) => a - b);
    earliestPosition = sorted[0];
    latestPosition = sorted[sorted.length - 1];
    averagePosition = activationPositions.reduce((sum, pos) => sum + pos, 0) / totalActivations;

    // Determine primary activation phase
    const phase1Start = (courseDistance * 1) / 6;
    const phase2Start = (courseDistance * 2) / 3;

    if (averagePosition < phase1Start) {
      primaryPhase = 'Start Phase';
    } else if (averagePosition < phase2Start) {
      primaryPhase = 'Middle Phase';
    } else {
      primaryPhase = 'Final Phase';
    }
  }

  if (!hasActivations) {
    return (
      <Card className="mt-2">
        <CardContent className="py-8 text-center">
          <div className="text-sm text-muted-foreground">
            No activation data available - this skill did not activate in any simulation runs.
          </div>
          <div className="text-xs text-muted-foreground mt-2">
            This may indicate that the skill's activation conditions are not met for this race
            configuration.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Skill Activation Analysis</CardTitle>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">Average Position</span>
              <span className="font-semibold">{Math.round(averagePosition)}m</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">Range</span>
              <span className="font-semibold">
                {Math.round(earliestPosition)}-{Math.round(latestPosition)}m
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">Primary Phase</span>
              <span className="font-semibold">{primaryPhase}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">Activations</span>
              <span className="font-semibold">{totalActivations}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-2">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          <ActivationEffectChart
            skillId={skillId}
            runData={runData}
            courseDistance={courseDistance}
            umaIndex={0}
          />
        </div>

        <div className="border-t flex flex-col gap-2 pt-2">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-chart-1" />
              <span className="text-muted-foreground">Early Race</span>
            </div>

            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-chart-3" />
              <span className="text-muted-foreground">Mid Race</span>
            </div>

            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-chart-4" />
              <span className="text-muted-foreground">Late Race</span>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            This visualization shows where along the race course this skill typically activates. Use
            this information to understand if the skill's activation conditions match your race
            strategy.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const gridClass = 'grid grid-cols-[50px_50px_50px_1fr_100px_100px_100px_100px] w-full';

export const BasinnChart = (props: BasinnChartProps) => {
  const {
    selectedSkills,
    onAddSkill,
    onSelectionChange,
    metrics,
    showUmaIcons = false,
    onReplaceOutfit,
    isSimulationRunning,
  } = props;

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (skillId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(skillId)) {
        next.delete(skillId);
      } else {
        next.add(skillId);
      }
      return next;
    });
  };

  const columns: Array<ColumnDef<SkillComparisonRoundResult>> = [
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
      id: 'visualize',
      header: '',
      cell: (info: CellContext<SkillComparisonRoundResult, unknown>) => {
        const row = info.row.original;
        const skillId = row.id;
        const hasRunData = row.runData != null;
        const filterReason = row.filterReason;

        let tooltipText = 'Show on race track';
        if (!hasRunData) {
          if (filterReason === 'negligible-effect') {
            tooltipText = 'Skill effect too small to measure (< 0.1 bashin)';
          } else if (filterReason === 'low-variance') {
            tooltipText = 'Skill effect too consistent to need detailed analysis';
          } else {
            tooltipText = 'No detailed data available (filtered during simulation)';
          }
        }

        return (
          <div className="flex items-center justify-center">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      onSelectionChange(skillId);
                    }}
                    disabled={!hasRunData}
                    title={tooltipText}
                  >
                    {selectedSkills.includes(skillId) ? (
                      <Eye className="h-4 w-4 text-primary" />
                    ) : (
                      <EyeClosed className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                }
              />
              <TooltipContent>{tooltipText}</TooltipContent>
            </Tooltip>
          </div>
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
              toggleRow(skillId);
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

        const skillNameA = skillnames[skillIdA as keyof typeof skillnames];
        const skillNameB = skillnames[skillIdB as keyof typeof skillnames];

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

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 30,
    getItemKey: (index) => rows[index].id,
    measureElement:
      typeof window !== 'undefined' && navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  // Search functionality
  const search = useTableSearch({
    rows,
    getSearchableText: (row) => {
      const skillId: string = row.getValue('id');
      return i18n.t(`skillnames.${skillId}`);
    },
    onScrollToRow: (index) => {
      virtualizer.scrollToIndex(index, { align: 'center' });
    },
  });

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
              <strong>Skills:</strong> {metrics.skillsProcessed}
            </span>
            <span>
              <strong>Samples:</strong> {metrics.totalSamples.toLocaleString()}
            </span>
            <span>
              <strong>Workers:</strong> {metrics.workerCount}
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
                      courseDistance={props.courseDistance ?? 1400}
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
