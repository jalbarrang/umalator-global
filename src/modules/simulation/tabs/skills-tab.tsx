import { useMemo } from 'react';
import { useRaceStore } from '@simulation/stores/compare.store';
import { getSkillNameById } from '@/modules/skills/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Zap } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

type SkillPosition = {
  id: string;
  name: string;
  start: number;
  end: number;
  duration: number;
};

export const SkillsTab = () => {
  const { chartData } = useRaceStore();

  const skillPositionsUma1: SkillPosition[] = useMemo(() => {
    if (!chartData?.sk?.[0]) return [];

    const skillPositions: SkillPosition[] = [];
    for (const [id, positions] of chartData.sk[0].entries()) {
      const skillName = getSkillNameById(id);

      positions.forEach(([start, end]: [number, number]) => {
        skillPositions.push({
          id,
          name: skillName,
          start,
          end,
          duration: end - start,
        });
      });
    }

    return skillPositions.toSorted((a, b) => a.start - b.start);
  }, [chartData]);

  const skillPositionsUma2: SkillPosition[] = useMemo(() => {
    if (!chartData?.sk?.[1]) return [];

    const skillPositions: SkillPosition[] = [];
    for (const [id, positions] of chartData.sk[1].entries()) {
      const skillName = getSkillNameById(id);

      positions.forEach(([start, end]: [number, number]) => {
        skillPositions.push({
          id,
          name: skillName,
          start,
          end,
          duration: end - start,
        });
      });
    }

    return skillPositions.toSorted((a, b) => a.start - b.start);
  }, [chartData]);

  if (!chartData) {
    return (
      <Empty className="py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Zap />
          </EmptyMedia>
          <EmptyTitle>No Skill Data</EmptyTitle>
          <EmptyDescription>
            Run a simulation to see when and where skills activate during the
            race.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const hasUma1Skills = skillPositionsUma1.length > 0;
  const hasUma2Skills = skillPositionsUma2.length > 0;

  if (!hasUma1Skills && !hasUma2Skills) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground">
        No skills activated during this simulation run.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Side-by-side skill tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Uma 1 Skills */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-[#2a77c5] dark:bg-blue-500 text-white text-center py-2 font-bold">
            Umamusume 1 Skills
            {hasUma1Skills && (
              <span className="ml-2 text-sm font-normal opacity-80">
                ({skillPositionsUma1.length} activations)
              </span>
            )}
          </div>
          {hasUma1Skills ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-right">Start</TableHead>
                  <TableHead className="text-right">End</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skillPositionsUma1.map((skill, index) => (
                  <TableRow key={`${skill.id}-${index}`}>
                    <TableCell className="font-medium">{skill.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {skill.start.toFixed(1)}m
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {skill.end.toFixed(1)}m
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {skill.duration.toFixed(1)}m
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4 text-center text-foreground text-sm">
              No skills activated
            </div>
          )}
        </div>

        {/* Uma 2 Skills */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-[#c52a2a] text-white text-center py-2 font-bold">
            Umamusume 2 Skills
            {hasUma2Skills && (
              <span className="ml-2 text-sm font-normal opacity-80">
                ({skillPositionsUma2.length} activations)
              </span>
            )}
          </div>
          {hasUma2Skills ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-right">Start</TableHead>
                  <TableHead className="text-right">End</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {skillPositionsUma2.map((skill, index) => (
                  <TableRow key={`${skill.id}-${index}`}>
                    <TableCell className="font-medium">{skill.name}</TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {skill.start.toFixed(1)}m
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {skill.end.toFixed(1)}m
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {skill.duration.toFixed(1)}m
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-4 text-center text-foreground text-sm">
              No skills activated
            </div>
          )}
        </div>
      </div>

      {/* Skills Summary */}
      <div className="bg-background border-2 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-foreground mb-3">
          Skills Summary
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex flex-col items-center p-3  rounded-lg border">
            <span className="text-[#2a77c5] font-bold text-2xl">
              {skillPositionsUma1.length}
            </span>
            <span className="text-foreground text-xs">Uma 1 Activations</span>
          </div>
          <div className="flex flex-col items-center p-3  rounded-lg border">
            <span className="text-[#c52a2a] font-bold text-2xl">
              {skillPositionsUma2.length}
            </span>
            <span className="text-foreground text-xs">Uma 2 Activations</span>
          </div>
          <div className="flex flex-col items-center p-3  rounded-lg border">
            <span className="text-[#2a77c5] font-bold text-lg font-mono">
              {hasUma1Skills
                ? skillPositionsUma1
                    .reduce((sum, s) => sum + s.duration, 0)
                    .toFixed(1)
                : '0'}
              m
            </span>
            <span className="text-foreground text-xs">
              Uma 1 Total Skill Distance
            </span>
          </div>
          <div className="flex flex-col items-center p-3  rounded-lg border">
            <span className="text-[#c52a2a] font-bold text-lg font-mono">
              {hasUma2Skills
                ? skillPositionsUma2
                    .reduce((sum, s) => sum + s.duration, 0)
                    .toFixed(1)
                : '0'}
              m
            </span>
            <span className="text-foreground text-xs">
              Uma 2 Total Skill Distance
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
