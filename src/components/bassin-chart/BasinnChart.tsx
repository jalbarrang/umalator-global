import { useState } from 'react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import {
  CellContext,
  Column,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import icons from '@data/icons.json';
import skillnames from '@data/skillnames.json';
import umas from '@data/umas.json';

import i18n from '@/i18n';
import { cn } from '@/lib/utils';
import { PoolMetrics, RoundResult } from '@/modules/simulation/types';
import { allSkills } from '@/modules/skills/utils';
import { formatMs } from '@/utils/time';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
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

const formatBasinn = (props: CellContext<RoundResult, unknown>) => {
  const value = props.getValue() as number;

  return value.toFixed(2).replace('-0.00', '0.00') + ' L';
};

const skillNameCell =
  (showUmaIcons: boolean = false) =>
  (props: CellContext<RoundResult, unknown>) => {
    const id = props.getValue() as string;

    const skill = allSkills.find((skill) => skill.originalId === id);

    if (showUmaIcons) {
      const umaId = umaForUniqueSkill(id);

      if (umaId && icons[umaId as keyof typeof icons]) {
        const icon = icons[umaId as keyof typeof icons];

        return (
          <div
            className="flex items-center gap-2"
            data-itemtype="uma"
            data-itemid={umaId}
          >
            <img src={icon} className="w-8 h-8" />
            <span>{i18n.t(`skillnames.${id}`)}</span>
          </div>
        );
      }
    }

    if (!skill) {
      return (
        <div
          className="flex items-center gap-2"
          data-itemtype="skill"
          data-itemid={id}
        >
          <span>{i18n.t(`skillnames.${id}`)}</span>
        </div>
      );
    }

    return (
      <div
        className="flex items-center gap-2"
        data-itemtype="skill"
        data-itemid={id}
      >
        <img src={`/icons/${skill.meta.iconId}.png`} className="w-4 h-4" />
        <span>{i18n.t(`skillnames.${id}`)}</span>
      </div>
    );
  };

const sortableHeader =
  (name: string, _key: string) =>
  ({ column }: { column: Column<RoundResult> }) => {
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
  data: RoundResult[];
  hiddenSkills: string[];
  showUmaIcons?: boolean;
  metrics?: PoolMetrics | null;
  selectedSkills: string[];
  isSimulationRunning: boolean;
  onAddSkill: (id: string) => void;
  onSelectionChange: (id: string) => void;
  onReplaceOutfit?: (id: string) => void;
};

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

  const columns: ColumnDef<RoundResult>[] = [
    {
      id: 'actions',
      header: '',
      cell: (info: CellContext<RoundResult, unknown>) => {
        const skillId = info.row.getValue('id') as string;

        const handleClick = () => {
          onAddSkill(skillId);
        };

        const handleReplaceOutfit = () => {
          onReplaceOutfit?.(skillId);
        };

        if (!onReplaceOutfit) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClick}
              className="h-8 w-8 p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          );
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleClick}>
                Add Skill to Runner
              </DropdownMenuItem>
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
      cell: (info: CellContext<RoundResult, unknown>) => {
        const row = info.row.original;
        const skillId = row.id as string;
        const hasRunData = row.runData != null;
        const filterReason = row.filterReason;

        let tooltipText = 'Show on race track';
        if (!hasRunData) {
          if (filterReason === 'negligible-effect') {
            tooltipText = 'Skill effect too small to measure (< 0.1 bashin)';
          } else if (filterReason === 'low-variance') {
            tooltipText =
              'Skill effect too consistent to need detailed analysis';
          } else {
            tooltipText =
              'No detailed data available (filtered during simulation)';
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

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'mean', desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState({});

  // eslint-disable-next-line react-hooks/incompatible-library
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
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const id: string = row.getValue('id');
              const isSelected = selectedSkills.includes(id);

              return (
                <TableRow
                  key={row.id}
                  data-skillid={id}
                  className={cn({
                    hidden: props.hiddenSkills.includes(id),
                    'bg-primary/5': isSelected,
                  })}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
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
