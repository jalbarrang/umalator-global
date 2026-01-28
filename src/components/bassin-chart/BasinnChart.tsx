import { useState } from 'react';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  EyeIcon,
  EyeOffIcon,
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
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ActivationFrequencyChart } from './ActivationFrequencyChart';
import { ActivationEffectChart } from './ActivationEffectChart';
import type { CellContext, Column, ColumnDef, SortingState } from '@tanstack/react-table';
import type { PoolMetrics, SkillComparisonRoundResult } from '@/modules/simulation/types';
import type { SkillSimulationData } from '@/modules/simulation/compare.types';
import icons from '@/modules/data/icons.json';
import umas from '@/modules/data/umas.json';
import skillnames from '@/modules/data/skillnames.json';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { allSkills } from '@/modules/skills/utils';
import { formatMs } from '@/utils/time';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

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
          <div className="flex items-center gap-2" data-itemtype="uma" data-itemid={umaId}>
            <img src={icon} className="w-8 h-8" />
            <span>{i18n.t(`skillnames.${id}`)}</span>
          </div>
        );
      }
    }

    if (!skill) {
      return (
        <div className="flex items-center gap-2" data-itemtype="skill" data-itemid={id}>
          <span>{i18n.t(`skillnames.${id}`)}</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2" data-itemtype="skill" data-itemid={id}>
        <img src={`/icons/${skill.meta.iconId}.png`} className="w-4 h-4" />
        <span>{i18n.t(`skillnames.${id}`)}</span>
      </div>
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
      <Button variant="ghost" onClick={handleClick}>
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
    if (run?.sk) {
      // Check both uma indices since skill could be on either runner
      [0, 1].forEach((umaIndex) => {
        const skillMap = run.sk[umaIndex];
        if (skillMap) {
          const activations = skillMap[skillId];
          if (activations) {
            activations.forEach((activation) => {
              activationPositions.push(activation.start);
            });
          }
        }
      });
    }
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
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActivationFrequencyChart
            skillId={skillId}
            runData={runData}
            courseDistance={courseDistance}
            umaIndex={0}
          />
          <ActivationEffectChart
            skillId={skillId}
            runData={runData}
            courseDistance={courseDistance}
            umaIndex={0}
          />
        </div>

        <div className="pt-2 border-t">
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

export const BasinnChart = (props: BasinnChartProps) => {
  const {
    selectedSkills,
    onAddSkill,
    onSelectionChange,
    metrics,
    showUmaIcons = false,
    onReplaceOutfit,
    isSimulationRunning,
    courseDistance = 2000,
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
                <EyeOffIcon className="h-4 w-4 text-primary" />
              ) : (
                <EyeIcon className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </div>
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
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { sorting, rowSelection },
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

      <div className="overflow-hidden border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const id: string = row.getValue('id');
              const isSelected = selectedSkills.includes(id);
              const isExpanded = expandedRows.has(id);
              const rowData = props.data.find((d) => d.id === id);
              const hasRunData = rowData?.runData != null;

              return (
                <>
                  <TableRow
                    key={row.id}
                    data-skillid={id}
                    className={cn({
                      hidden: props.hiddenSkills.includes(id),
                      'bg-primary/5': isSelected,
                      'border-b-0': isExpanded && hasRunData,
                    })}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>

                  {isExpanded && hasRunData && rowData?.runData && (
                    <TableRow
                      key={`${row.id}-expanded`}
                      className={cn({
                        hidden: props.hiddenSkills.includes(id),
                      })}
                    >
                      <TableCell colSpan={table.getAllColumns().length} className="p-4 bg-muted/30">
                        <ActivationDetails
                          skillId={id}
                          runData={rowData.runData}
                          courseDistance={courseDistance}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage() || isSimulationRunning}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || isSimulationRunning}
        >
          Next
        </Button>
      </div>
    </div>
  );
};
