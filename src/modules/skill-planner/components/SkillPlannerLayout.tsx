import { useMemo } from 'react';
import { HelpCircleIcon, PlusIcon, TrashIcon } from 'lucide-react';
import {
  addCandidate,
  addObtainedSkill,
  clearCandidates,
  resetRunner,
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
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { Button } from '@/components/ui/button';
import {
  getSelectableSkillsForUma,
  getUniqueSkillForByUmaId,
  nonUniqueSkillIds,
} from '@/modules/skills/utils';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-list/SkillPickerDrawer';
import { initializeSimulationRun } from '@/modules/simulation/compare.types';

export function SkillPlannerLayout() {
  const { open: helpOpen, setOpen: setHelpOpen } = useHelpDialog();
  const { skillDrawerOpen, runner, result } = useSkillPlannerStore();

  const umaId = useMemo(() => {
    if (runner.outfitId) {
      return runner.outfitId;
    }

    return '';
  }, [runner.outfitId]);

  const handleSkillSelect = (skills: Array<string>) => {
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
    // Update runner state without rebuilding candidates
    // This preserves auto-added family members (e.g., stackable tiers, gold skill whites)
    updateRunner(updates);

    // Only handle unique skill if outfit changed
    if (updates.outfitId) {
      const uniqueSkill = getUniqueSkillForByUmaId(updates.outfitId);

      // Add unique skill to candidates if not already there
      addCandidate(uniqueSkill, 0);

      // Mark unique skill as obtained
      addObtainedSkill(uniqueSkill);
    }
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
        currentSkills={[]}
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
