import { useMemo } from 'react';
import { HelpCircleIcon, PlusIcon, TrashIcon } from 'lucide-react';
import {
  addCandidate,
  clearCandidates,
  createCandidate,
  resetRunner,
  setCandidates,
  setSkillsOpen,
  updateRunner,
  useSkillPlannerStore,
} from '../skill-planner.store';
import { CandidateSkillList } from './CandidateSkillList';
import { SkillPlannerResults } from './SkillPlannerResults';
import { HelpDialog, useHelpDialog } from './HelpDialog';
import { RunnerCard } from './RunnerCard';
import { CostModifiersPanel } from './CostModifiersPanel';
import { SkillPlannerRaceTrack } from './SkillPlannerRaceTrack';
import { RaceSettingsPanel } from './RaceSettingsPanel';
import type { CandidateSkill } from '../types';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { Button } from '@/components/ui/button';
import {
  getSelectableSkillsForUma,
  getUniqueSkillForByUmaId,
  nonUniqueSkillIds,
  skillsById,
} from '@/modules/skills/utils';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-list/SkillPickerDrawer';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';

export function SkillPlannerLayout() {
  const { open: helpOpen, setOpen: setHelpOpen } = useHelpDialog();
  const { skillDrawerOpen, runner, result, hasFastLearner } = useSkillPlannerStore();

  const umaId = useMemo(() => {
    if (runner.outfitId) {
      return runner.outfitId;
    }

    return '';
  }, [runner.outfitId]);

  const handleSkillSelect = (skills: Array<string>) => {
    updateRunner({ skills });

    for (const skillId of skills) {
      addCandidate(skillId, 0);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setSkillsOpen(open);
  };

  // Get available skills based on selected outfit
  const availableSkills = useMemo(() => {
    if (umaId) {
      return getSelectableSkillsForUma(umaId);
    }

    return nonUniqueSkillIds;
  }, [umaId]);

  const handleUpdateRunner = (updates: Partial<RunnerState>) => {
    const newSkills: Array<string> = [];
    const newCandidates: Record<string, CandidateSkill> = {};

    for (const skillId of runner.skills) {
      const skillData = skillsById.get(skillId);

      if (skillData?.data?.rarity && skillData.data.rarity < 3) {
        newSkills.push(skillId);
        const candidate = createCandidate({
          skillId: skillId,
          hasFastLearner: hasFastLearner,
        });

        newCandidates[skillId] = candidate;
      }
    }

    if (updates.outfitId) {
      const uniqueSkill = getUniqueSkillForByUmaId(updates.outfitId);
      newSkills.push(uniqueSkill);
      const uniqueCandidate = createCandidate({
        skillId: uniqueSkill,
        hasFastLearner: hasFastLearner,
        isObtained: true,
      });
      newCandidates[uniqueSkill] = uniqueCandidate;
    }

    updateRunner(updates);
    setCandidates(newCandidates);
  };

  const handleResetRunner = () => {
    resetRunner();
  };

  return (
    <>
      <SkillPickerDrawer
        open={skillDrawerOpen}
        umaId={umaId}
        options={availableSkills}
        currentSkills={runner.skills}
        onSelect={handleSkillSelect}
        onOpenChange={handleOpenChange}
      />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <div className="flex flex-col gap-2 w-[500px]">
          <RunnerCard
            value={runner}
            onChange={handleUpdateRunner}
            onReset={handleResetRunner}
            className="bg-card p-2 rounded border"
          />

          <div className="bg-card p-2 rounded border flex flex-col gap-2">
            <div className="flex justify-end items-center gap-2">
              <Button size="sm" onClick={() => setSkillsOpen(true)}>
                Add Skills
                <PlusIcon className="w-4 h-4" />
              </Button>

              <Button variant="destructive" size="sm" onClick={() => clearCandidates()}>
                Clear All
                <TrashIcon className="w-4 h-4" />
              </Button>

              <Button variant="outline" size="sm" onClick={() => setHelpOpen(true)}>
                Help
                <HelpCircleIcon className="w-4 h-4" />
              </Button>
            </div>

            <CandidateSkillList />
          </div>
        </div>

        {/* Right Panel - Race Settings, RaceTrack, Optimization Controls & Results */}
        <div className="flex flex-col gap-2 flex-1">
          {/* Always visible race settings */}
          <RaceSettingsPanel />

          {/* RaceTrack visualization - only after optimization */}
          {result && result.runData && (
            <SkillPlannerRaceTrack
              chartData={result.runData.medianrun ?? initializeSimulationRun()}
            />
          )}

          <CostModifiersPanel />
          <SkillPlannerResults />
        </div>
      </div>
    </>
  );
}
