import { useMemo, useState } from 'react';
import { ImageIcon, PlusIcon } from 'lucide-react';
import { toast } from 'sonner';
import { addCandidate, removeCandidate, useSkillPlannerStore } from '../skill-planner.store';
import { CandidateSkillList } from './CandidateSkillList';
import { Button } from '@/components/ui/button';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-list/SkillPickerDrawer';
import { getSelectableSkillsForUma } from '@/modules/skills/utils';

export function SkillPlannerShopStep() {
  const { runner, candidates } = useSkillPlannerStore();
  const [skillPickerOpen, setSkillPickerOpen] = useState(false);

  const candidateIds = useMemo(() => Object.keys(candidates), [candidates]);

  const availableSkills = useMemo(() => {
    if (!runner.outfitId) {
      return [];
    }

    return getSelectableSkillsForUma(runner.outfitId);
  }, [runner.outfitId]);

  const handleSelectSkills = (skills: Array<string>) => {
    const nextSkillIds = new Set(skills);
    const currentSkillIds = new Set(candidateIds);

    for (const skillId of candidateIds) {
      if (!nextSkillIds.has(skillId)) {
        removeCandidate(skillId);
      }
    }

    for (const skillId of nextSkillIds) {
      if (!currentSkillIds.has(skillId)) {
        addCandidate(skillId);
      }
    }
  };

  return (
    <>
      <SkillPickerDrawer
        open={skillPickerOpen}
        umaId={runner.outfitId}
        options={availableSkills}
        currentSkills={candidateIds}
        onSelect={handleSelectSkills}
        onOpenChange={setSkillPickerOpen}
      />

      <div className="flex flex-col gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-4 text-sm font-medium">Shop skills</div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              className="justify-start sm:flex-1"
              onClick={() => toast.info('Shop screenshot import is next up in this refactor.')}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Import shop screenshots
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="justify-start sm:flex-1"
              onClick={() => setSkillPickerOpen(true)}
              disabled={!runner.outfitId}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add skills manually
            </Button>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <CandidateSkillList />
        </div>
      </div>
    </>
  );
}
