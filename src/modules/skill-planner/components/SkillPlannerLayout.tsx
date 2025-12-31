import { useMemo } from 'react';
import { HelpCircleIcon, PlusIcon, TrashIcon } from 'lucide-react';
import {
  addCandidate,
  clearCandidates,
  setRunner,
  setSkillsOpen,
  setSkillsSelected,
  useSkillPlannerStore,
} from '../store';
import { CandidateSkillList } from './CandidateSkillList';
import { SkillPlannerResults } from './SkillPlannerResults';
import { HelpDialog, useHelpDialog } from './HelpDialog';
import { RunnerCard } from './runner-card';
import { CostModifiersPanel } from './CostModifiersPanel';
import type { RunnerState } from '@/modules/runners/components/runner-card/types';
import { Button } from '@/components/ui/button';
import { getSelectableSkillsForUma, nonUniqueSkillIds } from '@/modules/skills/utils';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-list/SkillPickerDrawer';

export function SkillPlannerLayout() {
  const { open: helpOpen, setOpen: setHelpOpen } = useHelpDialog();
  const {
    skills: { open: skillsOpen, selected: selectedSkills },
    runner,
  } = useSkillPlannerStore();

  const umaId = useMemo(() => {
    if (runner.outfitId) {
      return runner.outfitId;
    }

    return '';
  }, [runner.outfitId]);

  const handleSkillSelect = (skills: Array<string>) => {
    setSkillsSelected(skills);

    // Add newly selected skills as candidates
    skills.forEach((skillId) => {
      // Extract base skill ID (remove debuff suffix if present)
      const baseSkillId = skillId.split('-')[0];
      if (baseSkillId) {
        addCandidate(baseSkillId, 0);
      }
    });
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

  const handleRunnerChange = (newRunner: Partial<RunnerState>) => {
    setRunner({ ...runner, ...newRunner });
  };

  return (
    <>
      <SkillPickerDrawer
        open={skillsOpen}
        umaId={umaId}
        options={availableSkills}
        currentSkills={selectedSkills}
        onSelect={handleSkillSelect}
        onOpenChange={handleOpenChange}
      />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <div className="flex flex-col md:flex-row gap-2 flex-1 min-h-0">
        <div className="flex flex-col gap-2 w-[500px]">
          <RunnerCard
            value={runner}
            onChange={handleRunnerChange}
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

        {/* Right Panel - Optimization Controls & Results */}
        <div className="flex flex-col gap-2 flex-1">
          <CostModifiersPanel />
          <SkillPlannerResults />
        </div>
      </div>
    </>
  );
}
