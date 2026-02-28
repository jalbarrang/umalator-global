import { Virtualizer } from '@tanstack/react-virtual';
import { flexRender, type Row } from '@tanstack/react-table';
import { SkillComparisonRoundResult } from '@/modules/simulation/types';
import { cn } from '@/lib/utils';
import { gridClass } from './BasinnChart';
import { ActivationDetails } from './activation-details';

export type BassinTableBodyProps = {
  virtualizer: Virtualizer<HTMLDivElement, Element>;
  rows: Row<SkillComparisonRoundResult>[];
  selectedSkills: string[];
  expandedRows: Set<string>;
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

export const BassinTableBody = (props: BassinTableBodyProps) => {
  const {
    virtualizer,
    rows,
    selectedSkills,
    expandedRows,
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
      {virtualizer.getVirtualItems().map((virtualRow, _index) => {
        const row = rows[virtualRow.index];

        const id: string = row.getValue('id');
        const isSelected = selectedSkills.includes(id);
        const isExpanded = expandedRows.has(id);
        const rowData = row.original;
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
                hidden: hiddenSkills.includes(id),
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
                courseDistance={courseDistance ?? 1400}
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
  );
};
