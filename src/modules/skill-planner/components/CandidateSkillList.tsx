import { TrashIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  addObtainedSkill,
  removeCandidate,
  removeObtainedSkill,
  setCandidateHintLevel,
  useSkillPlannerStore,
} from '../skill-planner.store';
import { calculateSkillCost } from '../cost-calculator';
import type { CandidateSkill, HintLevel } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getSkillMetaById,
  getSkillNameById,
  getUniqueSkillForByUmaId,
} from '@/modules/skills/utils';
import { Separator } from '@/components/ui/separator';
import { SkillIcon } from '@/modules/skills/components/skill-list/SkillItem';

export function CandidateSkillList() {
  const { candidates, runner, obtainedSkills } = useSkillPlannerStore();

  const candidateList = useMemo(() => Object.values(candidates), [candidates]);
  const uniqueSkillId = useMemo(() => {
    if (!runner.outfitId) return '';

    return getUniqueSkillForByUmaId(runner.outfitId);
  }, [runner.outfitId]);

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Candidate List */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {candidateList.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No candidate skills added yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {candidateList.map((candidate) => (
              <CandidateSkillItem
                key={candidate.skillId}
                candidate={candidate}
                isUnique={candidate.skillId === uniqueSkillId}
                isObtained={obtainedSkills.includes(candidate.skillId)}
              />
            ))}
          </div>
        )}

        {/* Summary */}
        {candidateList.length > 0 && (
          <>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-end gap-2">
                <span>Skills:</span>
                <span className="font-medium">{candidateList.length}</span>
              </div>
              <div className="flex justify-end gap-2">
                <span>Purchaseable:</span>
                <span className="font-medium">
                  {candidateList.filter((c) => !obtainedSkills.includes(c.skillId)).length}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type CandidateSkillItemProps = {
  candidate: CandidateSkill;
  isUnique: boolean;
  isObtained: boolean;
};

function CandidateSkillItem(props: CandidateSkillItemProps) {
  const { candidate, isUnique, isObtained } = props;
  const { hasFastLearner } = useSkillPlannerStore();

  const skillName = useMemo(() => getSkillNameById(candidate.skillId), [candidate.skillId]);

  const handleHintLevelChange = (value: HintLevel | null) => {
    if (value !== null) {
      setCandidateHintLevel(candidate.skillId, value);
    }
  };

  const handleObtainedChange = (checked: boolean) => {
    if (checked) {
      addObtainedSkill(candidate.skillId);
    } else {
      removeObtainedSkill(candidate.skillId);
    }
  };

  const handleRemove = () => {
    removeCandidate(candidate.skillId);
  };

  const selectedHintLevel = useMemo(() => {
    if (candidate.hintLevel === 1) {
      return 'Lvl 1 (10% off)';
    } else if (candidate.hintLevel === 2) {
      return 'Lvl 2 (20% off)';
    } else if (candidate.hintLevel === 3) {
      return 'Lvl 3 (30% off)';
    } else if (candidate.hintLevel === 4) {
      return 'Lvl 4 (35% off)';
    } else if (candidate.hintLevel === 5) {
      return 'Lvl Max (40% off)';
    }

    return 'No hint';
  }, [candidate.hintLevel]);

  const skillIconId = useMemo(() => {
    const skillMeta = getSkillMetaById(candidate.skillId);
    return skillMeta.iconId;
  }, [candidate.skillId]);

  const effectiveCost = useMemo(() => {
    return calculateSkillCost(candidate.skillId, candidate.hintLevel, hasFastLearner);
  }, [candidate.skillId, candidate.hintLevel, hasFastLearner]);

  return (
    <div className="border rounded-lg p-3 bg-card flex flex-col gap-3">
      {/* Skill Name and Remove Button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div>
            <SkillIcon iconId={skillIconId} />
          </div>
          <p className="font-medium text-sm">{skillName}</p>
        </div>

        <div className="flex flex-col gap-4">
          {!isUnique && !isObtained && (
            <div className="flex items-center gap-2">
              <Select value={candidate.hintLevel} onValueChange={handleHintLevelChange}>
                <SelectTrigger id={`hint-${candidate.skillId}`} className="text-xs">
                  <SelectValue>{selectedHintLevel}</SelectValue>
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value={0}>No hint</SelectItem>
                  <SelectItem value={1}>Lvl 1 (10% off)</SelectItem>
                  <SelectItem value={2}>Lvl 2 (20% off)</SelectItem>
                  <SelectItem value={3}>Lvl 3 (30% off)</SelectItem>
                  <SelectItem value={4}>Lvl 4 (35% off)</SelectItem>
                  <SelectItem value={5}>Lvl Max (40% off)</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="destructive" size="icon" onClick={handleRemove}>
                <TrashIcon className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Checkboxes */}
          {!isUnique && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-end gap-2">
                <Checkbox
                  id={`obtained-${candidate.skillId}`}
                  checked={isObtained}
                  onCheckedChange={handleObtainedChange}
                />
                <Label
                  htmlFor={`obtained-${candidate.skillId}`}
                  className="text-xs cursor-pointer font-normal"
                >
                  Obtained
                </Label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cost Display */}
      {!isObtained && (
        <div className="flex flex-col gap-1 pt-2 border-t text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Cost:</span>
            <span className="font-medium">{effectiveCost} pts</span>
          </div>
        </div>
      )}
    </div>
  );
}
