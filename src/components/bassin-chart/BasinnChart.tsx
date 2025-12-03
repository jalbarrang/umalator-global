import { useId, useMemo, useState } from 'react';

import {
  // createSortedRowModel,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  // rowSortingFeature,
  // sortFns,
  SortingState,
  // tableFeatures,
  useReactTable,
} from '@tanstack/react-table';

import { getParser } from '@simulation/lib/ConditionParser';
import { CourseData } from '@simulation/lib/CourseData';
import { RaceParameters } from '@simulation/lib/RaceParameters';
import { Perspective } from '@simulation/lib/RaceSolver';
import {
  buildBaseStats,
  buildSkillData,
} from '@simulation/lib/RaceSolverBuilder';
import { Region, RegionList } from '@simulation/lib/Region';

import { BasinnChartData } from '@/utils/constants';
import skill_meta from '@data/skill_meta.json';
import skillnames from '@data/skillnames.json';
import umas from '@data/umas.json';
import icons from '@data/icons.json';

import './BasinnChart.css';
import i18n from '@/i18n';
import { cn } from '@/lib/utils';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { setDisplaying } from '@/store/race/store';

function skillmeta(id: string) {
  // handle the fake skills (e.g., variations of Sirius unique) inserted by make_skill_data with ids like 100701-1
  return skill_meta[id.split('-')[0]];
}

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

export function getActivateableSkills(
  skills: string[],
  horse: RunnerState,
  course: CourseData,
  racedef: RaceParameters,
) {
  const parser = getParser();
  const h2 = buildBaseStats(horse, horse.mood);
  const wholeCourse = new RegionList();
  wholeCourse.push(new Region(0, course.distance));
  return skills.filter((id) => {
    let sd;
    try {
      sd = buildSkillData(
        h2,
        racedef,
        course,
        wholeCourse,
        parser,
        id,
        Perspective.Any,
      );
    } catch (_) {
      return false;
    }
    return sd.some(
      (trigger) =>
        trigger.regions.length > 0 && trigger.regions[0].start < 9999,
    );
  });
}

export function getNullRow(skillid: string) {
  return {
    id: skillid,
    min: 0,
    max: 0,
    mean: 0,
    median: 0,
    results: [],
    runData: null,
  };
}

function formatBasinn(info) {
  return info.getValue().toFixed(2).replace('-0.00', '0.00') + ' L';
}

function SkillNameCell(props) {
  const { id, showUmaIcons = false } = props;

  if (showUmaIcons) {
    const umaId = umaForUniqueSkill(id);
    if (umaId && icons[umaId]) {
      return (
        <div className="chartSkillName">
          <img src={icons[umaId]} />
          <span>{i18n.t(`skillnames.${id}`)}</span>
        </div>
      );
    }
  }

  return (
    <div className="chartSkillName">
      <img src={`/icons/${skillmeta(id).iconId}.png`} />
      <span>{i18n.t(`skillnames.${id}`)}</span>
    </div>
  );
}

type HeaderRendererProps = {
  radioGroup: string;
  selectedType: string;
  type: string;
  text: string;
  onClick: (type: string) => void;
};

const headerRenderer = ({
  radioGroup,
  selectedType,
  type,
  text,
  onClick,
}: HeaderRendererProps) => {
  return (column) => {
    const handleClick: React.MouseEventHandler<HTMLInputElement> = (e) => {
      e.stopPropagation();
      onClick(type);
    };

    const handleSpanClick: React.MouseEventHandler<HTMLSpanElement> = (e) => {
      e.stopPropagation();
      column.header.column.getToggleSortingHandler();
    };

    return (
      <div>
        <input
          type="radio"
          name={radioGroup}
          checked={selectedType === type}
          title={`show ${type} on chart`}
          aria-label={`show ${type} on chart`}
          onClick={handleClick}
          readOnly
        />

        <span onClick={handleSpanClick}>{text}</span>
      </div>
    );
  };
};

type BasinnChartProps = {
  data: BasinnChartData[];
  hiddenSkills: string[];
  showUmaIcons?: boolean;
  onInfoClick: (id: string) => void;
  onSelectionChange: (id: string) => void;
  onDblClickRow: (id: string) => void;
};

export function BasinnChart(props: BasinnChartProps) {
  const radioGroup = useId();
  const [selected, setSelected] = useState('');
  const [selectedType, setSelectedType] = useState('mean');

  function headerClick(type) {
    setSelectedType(type);
    setDisplaying(type + 'run');
  }

  const columns = useMemo(
    () => [
      {
        header: () => <span>Skill name</span>,
        accessorKey: 'id',
        cell: (info) => (
          <SkillNameCell
            id={info.getValue()}
            showUmaIcons={props.showUmaIcons}
          />
        ),
        sortingFn: (a, b, _) => (skillnames[a] < skillnames[b] ? -1 : 1),
      },
      {
        header: headerRenderer({
          radioGroup,
          selectedType,
          type: 'min',
          text: 'Minimum',
          onClick: headerClick,
        }),
        accessorKey: 'min',
        cell: formatBasinn,
      },
      {
        header: headerRenderer({
          radioGroup,
          selectedType,
          type: 'max',
          text: 'Maximum',
          onClick: headerClick,
        }),
        accessorKey: 'max',
        cell: formatBasinn,
        sortDescFirst: true,
      },
      {
        header: headerRenderer({
          radioGroup,
          selectedType,
          type: 'mean',
          text: 'Mean',
          onClick: headerClick,
        }),
        accessorKey: 'mean',
        cell: formatBasinn,
        sortDescFirst: true,
      },
      {
        header: headerRenderer({
          radioGroup,
          selectedType,
          type: 'median',
          text: 'Median',
          onClick: headerClick,
        }),
        accessorKey: 'median',
        cell: formatBasinn,
        sortDescFirst: true,
      },
    ],
    [selectedType, props.showUmaIcons],
  );

  const [sorting, setSorting] = useState<SortingState>([
    { id: 'mean', desc: true },
  ]);

  const table = useReactTable({
    // _features: tableFeatures({ rowSortingFeature }),
    // _rowModels: { sortedRowModel: createSortedRowModel(sortFns) },
    columns,
    data: props.data,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSortingRemoval: false,
    state: { sorting },
    onSortingChange: setSorting,
  });

  function handleClick(e) {
    const tr = e.target.closest('tr');
    if (tr == null) return;
    e.stopPropagation();
    const id = tr.dataset.skillid;
    if (e.target.tagName == 'IMG') {
      props.onInfoClick(id);
    } else {
      setSelected(id);
      props.onSelectionChange(id);
    }
  }

  function handleDblClick(e) {
    const tr = e.target.closest('tr');
    if (!tr) return;

    e.stopPropagation();

    const id = tr.dataset.skillid;
    props.onDblClickRow(id);
  }

  return (
    <div className="basinnChartWrapper">
      <table className="basinnChart">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const isSorted = header.column.getIsSorted().toString();
                const nextSortingOrder = header.column
                  .getNextSortingOrder()
                  .toString();

                const classSortedCol = {
                  asc: 'basinnChartSortedAsc',
                  desc: 'basinnChartSortedDesc',
                  false: '',
                };

                const titleSortedCol = {
                  asc: 'Sort ascending',
                  desc: 'Sort descending',
                  false: 'Clear sort',
                };

                const columnTitle = header.column.getCanSort()
                  ? titleSortedCol[nextSortingOrder]
                  : '';

                return (
                  <th key={header.id} colSpan={header.colSpan}>
                    {!header.isPlaceholder && (
                      <div
                        className={`columnHeader ${classSortedCol[isSorted]}`}
                        title={columnTitle}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>

        <tbody onClick={handleClick} onDoubleClick={handleDblClick}>
          {table.getRowModel().rows.map((row) => {
            const id: string = row.getValue('id');

            return (
              <tr
                key={row.id}
                data-skillid={id}
                className={cn({ selected: id === selected })}
                style={
                  props.hiddenSkills.includes(id) ? { display: 'none' } : {}
                }
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
