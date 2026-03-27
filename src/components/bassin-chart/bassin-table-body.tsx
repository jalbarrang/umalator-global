import { Virtualizer } from '@tanstack/react-virtual';
import { flexRender, type Row } from '@tanstack/react-table';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SkillComparisonRoundResult } from '@/modules/simulation/types';
import { cn } from '@/lib/utils';
import { gridClass } from './BasinnChart';
import { ActivationDetails } from './activation-details';
import { Button } from '../ui/button';
import React from 'react';

type BassinVirtualItem = ReturnType<
  Virtualizer<HTMLDivElement, Element>['getVirtualItems']
>[number];

type ExpandCellProps = {
  skillId: string;
  hasRunData: boolean;
  isExpanded: boolean;
  onToggleRow: (skillId: string) => void;
};

const ExpandCell = React.memo(
  ({ skillId, hasRunData, isExpanded, onToggleRow }: ExpandCellProps) => {
    if (!hasRunData) return null;

    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          onToggleRow(skillId);
        }}
        title={isExpanded ? 'Collapse details' : 'Show activation details'}
      >
        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </Button>
    );
  },
);

type BassinVirtualTableRowProps = {
  virtualRow: BassinVirtualItem;
  row: Row<SkillComparisonRoundResult>;
  measureElement: (el: Element | null) => void;
  isSelected: boolean;
  isExpanded: boolean;
  hasRunData: boolean;
  isSearchMatch: boolean;
  isCurrentMatch: boolean;
  isPending: boolean;
  isHidden: boolean;
  courseDistance?: number;
  currentSeed: number | null;
  isSimulationRunning: boolean;
  skillLoading: boolean;
  onToggleRow: (skillId: string) => void;
  onRunAdditionalSamples?: (skillId: string, additionalSamples: number) => void;
};

const BassinVirtualTableRow = React.memo(function BassinVirtualTableRow(
  props: BassinVirtualTableRowProps,
) {
  const {
    virtualRow,
    row,
    measureElement,
    isSelected,
    isExpanded,
    hasRunData,
    isSearchMatch,
    isCurrentMatch,
    isPending,
    isHidden,
    courseDistance,
    currentSeed,
    isSimulationRunning,
    skillLoading,
    onToggleRow,
    onRunAdditionalSamples,
  } = props;

  const id: string = row.getValue('id');
  const rowData = row.original;

  return (
    <div
      data-index={virtualRow.index}
      ref={measureElement}
      className={cn(
        'w-full bg-background hover:bg-muted p-2 border-b last-of-type:border-b-0',
        'flex flex-col gap-2 transition-opacity duration-300',
        {
          hidden: isHidden,
          'bg-primary/5': isSelected && !isSearchMatch,
          'bg-yellow-100/50 dark:bg-yellow-900/20': isSearchMatch && !isCurrentMatch,
          'bg-yellow-200/70 dark:bg-yellow-800/40': isCurrentMatch,
          'opacity-40': isPending,
        },
      )}
      style={{
        position: 'absolute',
        transform: `translateY(${virtualRow.start}px)`,
      }}
    >
      <div className={gridClass}>
        {row.getVisibleCells().map((cell) => {
          const columnId = cell.column.id;
          const cellValue = cell.getValue();
          const extraProps: Record<string, unknown> = {};

          if (columnId === 'id') {
            extraProps['data-itemtype'] = 'skill';
            extraProps['data-itemid'] = cellValue;
          }

          if (columnId === 'expand') {
            return (
              <div key={cell.id} className="flex items-center gap-2">
                <ExpandCell
                  skillId={id}
                  hasRunData={hasRunData}
                  isExpanded={isExpanded}
                  onToggleRow={onToggleRow}
                />
              </div>
            );
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
          courseDistance={courseDistance ?? 1400}
          currentSeed={currentSeed}
          isGlobalSimulationRunning={isSimulationRunning}
          isSkillLoading={skillLoading}
          onRunAdditionalSamples={onRunAdditionalSamples}
        />
      )}
    </div>
  );
});

export type BassinTableBodyProps = {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  rows: Row<SkillComparisonRoundResult>[];
  selectedSkills: string[];
  expandedRows: Set<string>;
  onToggleRow: (skillId: string) => void;
  search: {
    matches: number[];
    currentMatchIndex: number;
  };
  hiddenSkills: string[];
  courseDistance?: number;
  currentSeed: number | null;
  isSimulationRunning: boolean;
  skillLoadingStates: Record<string, boolean>;
  onRunAdditionalSamples?: (skillId: string, additionalSamples: number) => void;
};

export const BassinTableBody = React.memo((props: BassinTableBodyProps) => {
  const {
    virtualizer,
    rows,
    selectedSkills,
    expandedRows,
    onToggleRow,
    search,
    hiddenSkills,
    courseDistance,
    currentSeed,
    isSimulationRunning,
    skillLoadingStates,
    onRunAdditionalSamples,
  } = props;

  return (
    <div
      className="relative"
      style={{
        height: `${virtualizer.getTotalSize()}px`,
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index];
        const id: string = row.getValue('id');
        const isSelected = selectedSkills.includes(id);
        const isExpanded = expandedRows.has(id);
        const rowData = row.original;
        const hasRunData = rowData?.runData != null;
        const isSearchMatch = search.matches.includes(virtualRow.index);
        const isCurrentMatch = search.matches[search.currentMatchIndex] === virtualRow.index;
        const isPending = isSimulationRunning && rowData.results.length === 0;

        return (
          <BassinVirtualTableRow
            key={row.id}
            virtualRow={virtualRow}
            row={row}
            measureElement={virtualizer.measureElement}
            isSelected={isSelected}
            isExpanded={isExpanded}
            hasRunData={hasRunData}
            isSearchMatch={isSearchMatch}
            isCurrentMatch={isCurrentMatch}
            isPending={isPending}
            isHidden={hiddenSkills.includes(id)}
            courseDistance={courseDistance}
            currentSeed={currentSeed}
            isSimulationRunning={isSimulationRunning}
            skillLoading={skillLoadingStates[id] ?? false}
            onToggleRow={onToggleRow}
            onRunAdditionalSamples={onRunAdditionalSamples}
          />
        );
      })}
    </div>
  );
});
