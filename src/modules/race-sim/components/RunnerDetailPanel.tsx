import { useCallback, useMemo } from 'react';
import { PlusIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { skillCollection } from '@/modules/data/skills';
import { AptitudesTable } from '@/modules/runners/components/runner-card/aptitudes-table';
import { StatsTable, type StatsKey } from '@/modules/runners/components/runner-card/stats-table';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { runawaySkillId } from '@/modules/runners/components/runner-card/types';
import { UmaSelector } from '@/modules/runners/components/runner-selector';
import { getUmaDisplayInfo, getUmaImageUrl } from '@/modules/runners/utils';
import { SkillItem } from '@/modules/skills/components/skill-list/SkillItem';
import { openSkillPicker, updateCurrentSkills } from '@/modules/skills/store';
import { getSelectableSkillsForUma, getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { updateRunner, useRaceSimStore } from '@/modules/simulation/stores/race-sim.store';
import { cn } from '@/lib/utils';

type RunnerDetailPanelProps = {
  runnerIndex: number;
  totalRunners: number;
  onNavigate: (index: number) => void;
};

export function RunnerDetailPanel({ runnerIndex, totalRunners, onNavigate }: Readonly<RunnerDetailPanelProps>) {
  const runner = useRaceSimStore((state) => {
    if (runnerIndex < 0 || runnerIndex >= state.runners.length) return null;
    return state.runners[runnerIndex];
  });

  const runnerDisplayName = useMemo(() => {
    if (!runner) return 'Runner';
    if (!runner.outfitId) return `Mob ${runnerIndex + 1}`;
    const displayInfo = getUmaDisplayInfo(runner.outfitId);
    return displayInfo ? `${displayInfo.name}` : 'Selected Runner';
  }, [runner, runnerIndex]);

  const outfitName = useMemo(() => {
    if (!runner?.outfitId) return null;
    const displayInfo = getUmaDisplayInfo(runner.outfitId);
    return displayInfo?.outfit ?? null;
  }, [runner?.outfitId]);

  const imageUrl = useMemo(
    () => getUmaImageUrl(runner?.outfitId, runner?.randomMobId),
    [runner?.outfitId, runner?.randomMobId],
  );

  const applyRunnerPatch = useCallback(
    (partial: Partial<RunnerState>) => {
      updateRunner(runnerIndex, partial);
    },
    [runnerIndex],
  );

  const handleUpdateStat = useCallback(
    (stat: StatsKey) => (value: number) => {
      applyRunnerPatch({ [stat]: value });
    },
    [applyRunnerPatch],
  );

  const handleSetSkills = useCallback(
    (skills: Array<string>) => {
      if (!runner) return;
      const partial: Partial<RunnerState> = { skills };
      if (skills.includes(runawaySkillId) && runner.strategy !== 'Runaway') {
        partial.strategy = 'Runaway';
      }
      applyRunnerPatch(partial);
      updateCurrentSkills(skills);
    },
    [applyRunnerPatch, runner],
  );

  const handleChangeRunner = useCallback(
    (outfitId: string) => {
      if (!runner) return;
      const keptSkills = runner.skills.filter((skillId) => {
        const baseSkillId = skillId.split('-')[0] ?? skillId;
        const skillData = skillCollection[baseSkillId];
        return Boolean(skillData?.rarity && skillData.rarity < 3);
      });
      if (outfitId) {
        keptSkills.push(getUniqueSkillForByUmaId(outfitId));
      }
      applyRunnerPatch({ outfitId, skills: keptSkills });
    },
    [applyRunnerPatch, runner],
  );

  const handleUpdateAptitudes = useCallback(
    (nextRunner: RunnerState) => {
      applyRunnerPatch(nextRunner);
    },
    [applyRunnerPatch],
  );

  const handleOpenSkillPicker = useCallback(() => {
    if (!runner) return;
    openSkillPicker({
      runnerId: `race-sim-runner-${runnerIndex}`,
      umaId: runner.outfitId,
      options: getSelectableSkillsForUma(runner.outfitId),
      currentSkills: runner.skills,
      onSelect: handleSetSkills,
    });
  }, [handleSetSkills, runner, runnerIndex]);

  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      if (!runner) return;
      handleSetSkills(runner.skills.filter((id) => id !== skillId));
    },
    [handleSetSkills, runner],
  );

  const handleRunawayStrategy = useCallback(() => {
    applyRunnerPatch({ strategy: 'Runaway' });
  }, [applyRunnerPatch]);

  const uniqueSkillId = useMemo(() => {
    if (!runner?.outfitId) return null;
    return getUniqueSkillForByUmaId(runner.outfitId);
  }, [runner?.outfitId]);

  const hasRunawaySkill = runner?.skills.includes(runawaySkillId) ?? false;

  if (!runner) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        <span className="text-sm">Invalid runner selection.</span>
      </div>
    );
  }

  const hasPrev = runnerIndex > 0;
  const hasNext = runnerIndex < totalRunners - 1;

  return (
    <div className="flex flex-1 flex-col min-h-0">
      <div className="flex items-center justify-between border-b px-4 py-3 bg-card/50">
        <div className="flex items-center gap-3">
          <img
            src={imageUrl}
            alt={runnerDisplayName}
            className="size-10 rounded-md object-cover ring-1 ring-border"
          />
          <div>
            <h2 className="text-sm font-semibold leading-tight">{runnerDisplayName}</h2>
            {outfitName && (
              <p className="text-xs text-muted-foreground leading-tight">{outfitName}</p>
            )}
            {!outfitName && (
              <p className="text-xs text-muted-foreground leading-tight">Gate {runnerIndex + 1}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!hasPrev}
            onClick={() => onNavigate(runnerIndex - 1)}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground min-w-[3ch] text-center">
            {runnerIndex + 1}/{totalRunners}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            disabled={!hasNext}
            onClick={() => onNavigate(runnerIndex + 1)}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-4">
          <Section title="Character">
            <UmaSelector
              value={runner.outfitId}
              select={handleChangeRunner}
              onReset={() => handleChangeRunner('')}
              randomMobId={runner.randomMobId}
            />
          </Section>

          <Section title="Stats">
            <StatsTable value={runner} onChange={handleUpdateStat} />
          </Section>

          <Section title="Aptitudes & Style">
            <AptitudesTable
              value={runner}
              onChange={handleUpdateAptitudes}
              hasRunawaySkill={hasRunawaySkill}
              onRunawayStrategy={handleRunawayStrategy}
            />
          </Section>

          <Section
            title="Skills"
            action={
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={handleOpenSkillPicker}
              >
                <PlusIcon className="size-3.5" />
                Add Skills
              </Button>
            }
          >
            {runner.skills.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
                <Sparkles className="size-5 text-muted-foreground/50" />
                <div className="text-sm text-muted-foreground">
                  No skills assigned yet.
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-1 h-7 text-xs gap-1"
                  onClick={handleOpenSkillPicker}
                >
                  <PlusIcon className="size-3" />
                  Browse Skills
                </Button>
              </div>
            )}

            {runner.skills.length > 0 && (
              <div className="grid grid-cols-1 gap-1.5">
                {runner.skills.map((skillId) => (
                  <SkillItem
                    key={skillId}
                    skillId={skillId}
                    dismissable={skillId !== uniqueSkillId}
                    onRemove={handleRemoveSkill}
                  />
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: Readonly<{
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className={cn(
          'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
        )}>
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}
