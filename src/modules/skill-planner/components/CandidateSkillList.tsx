import { TrashIcon } from 'lucide-react';
import { useMemo } from 'react';
import {
  removeCandidate,
  setCandidateHintLevel,
  setCandidateObtained,
  updateCandidate,
  useSkillPlannerStore,
} from '../skill-planner.store';
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
  const { candidates, runner } = useSkillPlannerStore();

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
                  {candidateList.filter((c) => !c.isObtained).length}
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
};

function CandidateSkillItem(props: CandidateSkillItemProps) {
  const { candidate, isUnique } = props;

  const skillName = useMemo(() => getSkillNameById(candidate.skillId), [candidate.skillId]);

  const handleHintLevelChange = (value: HintLevel | null) => {
    if (value !== null) {
      setCandidateHintLevel(candidate.skillId, value);
    }
  };

  const handleObtainedChange = (checked: boolean) => {
    setCandidateObtained(candidate.skillId, checked);
  };

  const handleStackableChange = (checked: boolean) => {
    updateCandidate(candidate.skillId, { isStackable: checked });
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

  return (
    <div className="border rounded-lg p-3 bg-card flex flex-col gap-3">
      {/* Skill Name and Remove Button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="">
            <SkillIcon iconId={skillIconId} />
          </div>
          <p className="font-medium text-sm">{skillName}</p>
        </div>

        <div className="flex flex-col gap-4">
          {!isUnique && !candidate.isObtained && (
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
                  checked={candidate.isObtained}
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
      {!candidate.isObtained && (
        <div className="flex justify-between items-center pt-2 border-t text-xs">
          <span className="text-muted-foreground">Cost:</span>
          <span className="font-medium">{candidate.effectiveCost} pts</span>
        </div>
      )}
    </div>
  );
}
