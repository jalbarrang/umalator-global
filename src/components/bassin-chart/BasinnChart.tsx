import { useMemo, useState } from 'react';

import {
  CellContext,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import skillnames from '@data/skillnames.json';
import umas from '@data/umas.json';
import icons from '@data/icons.json';

import './BasinnChart.css';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';
import { ChartTableEntry, useSimulationStore } from '@/store/simulation.store';
import { useUIStore } from '@/store/ui.store';
import { allSkills } from '@/modules/skills/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

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

  if (umas[baseUmaId] && umas[baseUmaId].outfits[outfitId]) {
    return outfitId;
  }

  return null;
}

const formatBasinn = (info) =>
  info.getValue().toFixed(2).replace('-0.00', '0.00') + ' L';

const skillNameCell =
  (showUmaIcons: boolean = false) =>
  (info: CellContext<ChartTableEntry, string>) => {
    const id = info.getValue();
    const skill = allSkills.find((skill) => skill.originalId === id);

    if (showUmaIcons) {
      const umaId = umaForUniqueSkill(id);

      if (umaId && icons[umaId]) {
        return (
          <div
            className="flex items-center gap-2"
            data-itemtype="uma"
            data-itemid={umaId}
          >
            <img src={icons[umaId]} className="w-8 h-8" />
            <span>{i18n.t(`skillnames.${id}`)}</span>
          </div>
        );
      }
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
  ({ column }) => {
    const isSorted = column.getIsSorted();

    const handleClick = () => {
      if (!isSorted) {
        // If not sorted, sort by descending by default.
        column.toggleSorting('desc');
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
  data: ChartTableEntry[];
  hiddenSkills: string[];
  showUmaIcons?: boolean;
  onInfoClick: (id: string) => void;
  onSelectionChange: (id: string) => void;
  onAddSkill: (id: string) => void;
  onChangeUma: (umaId: string) => void;
  onVisualizationToggle: (skillId: string) => void;
};

export const BasinnChart = (props: BasinnChartProps) => {
  'use no memo';

  const { onAddSkill, onChangeUma, showUmaIcons, onVisualizationToggle } =
    props;

  const { isSimulationRunning } = useUIStore();
  const { skillChart } = useSimulationStore();
  const selectedSkillsForVisualization = useMemo(
    () => skillChart?.selectedSkillsForVisualization ?? new Set(),
    [skillChart],
  );

  const columns = useMemo(
    () => [
      {
        id: 'actions',
        header: '',
        cell: (info: CellContext<ChartTableEntry, unknown>) => {
          const skillId = info.row.getValue('id') as string;
          const umaId = umaForUniqueSkill(skillId);
          const tooltipText = showUmaIcons ? 'Change Runner' : 'Add to Runner';

          const handleClick = () => {
            if (showUmaIcons && umaId) {
              onChangeUma(umaId);
            } else {
              onAddSkill(skillId);
            }
          };

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClick}
                    className="h-8 w-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        enableSorting: false,
      },
      {
        id: 'visualize',
        header: '',
        cell: (info: CellContext<ChartTableEntry, unknown>) => {
          const skillId = info.row.getValue('id') as string;
          const isSelected = selectedSkillsForVisualization.has(skillId);

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onVisualizationToggle(skillId)}
                      aria-label="Show on race track"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show on race track</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
        enableSorting: false,
      },
      {
        header: 'Skill name',
        accessorKey: 'id',
        cell: skillNameCell(showUmaIcons),
        sortingFn: (a, b, _) => (skillnames[a] < skillnames[b] ? -1 : 1),
      },
      {
        header: sortableHeader('Min', 'min'),
        accessorKey: 'min',
        cell: formatBasinn,
      },
      {
        header: sortableHeader('Max', 'max'),
        accessorKey: 'max',
        cell: formatBasinn,
      },
      {
        header: sortableHeader('Mean', 'mean'),
        accessorKey: 'mean',
        cell: formatBasinn,
      },
      {
        header: sortableHeader('Median', 'median'),
        accessorKey: 'median',
        cell: formatBasinn,
      },
    ],
    [
      showUmaIcons,
      onAddSkill,
      onChangeUma,
      onVisualizationToggle,
      selectedSkillsForVisualization,
    ],
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'mean', desc: true },
  ]);
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
              const isSelected = selectedSkillsForVisualization.has(id);

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
