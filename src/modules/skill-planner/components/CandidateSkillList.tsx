import { TrashIcon } from 'lucide-react';
import { useMemo } from 'react';
import { removeCandidate, updateCandidate, useSkillPlannerStore } from '../store';
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
import { getSkillNameById } from '@/modules/skills/utils';
import { Separator } from '@/components/ui/separator';

export function CandidateSkillList() {
  const { candidates } = useSkillPlannerStore();

  const candidateList = useMemo(() => Array.from(candidates.values()), [candidates]);

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
              <CandidateSkillItem key={candidate.skillId} candidate={candidate} />
            ))}
          </div>
        )}

        {/* Summary */}
        {candidateList.length > 0 && (
          <>
            <Separator />
            <div className="text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Total candidates:</span>
                <span className="font-medium">{candidateList.length}</span>
              </div>
              <div className="flex justify-between">
                <span>To purchase:</span>
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

function CandidateSkillItem({ candidate }: { candidate: CandidateSkill }) {
  const skillName = getSkillNameById(candidate.skillId);

  const handleHintLevelChange = (value: string | null) => {
    if (value !== null) {
      updateCandidate(candidate.skillId, { hintLevel: parseInt(value) as HintLevel });
    }
  };

  const handleObtainedChange = (checked: boolean) => {
    updateCandidate(candidate.skillId, { isObtained: checked });
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

  return (
    <div className="border rounded-lg p-3 bg-card flex flex-col gap-3">
      {/* Skill Name and Remove Button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-sm">{skillName}</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={candidate.hintLevel.toString()} onValueChange={handleHintLevelChange}>
            <SelectTrigger id={`hint-${candidate.skillId}`} className="text-xs">
              <SelectValue>{selectedHintLevel}</SelectValue>
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="0">No hint</SelectItem>
              <SelectItem value="1">Lvl 1 (10% off)</SelectItem>
              <SelectItem value="2">Lvl 2 (20% off)</SelectItem>
              <SelectItem value="3">Lvl 3 (30% off)</SelectItem>
              <SelectItem value="4">Lvl 4 (35% off)</SelectItem>
              <SelectItem value="5">Lvl Max (40% off)</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="destructive" size="icon" onClick={handleRemove}>
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Checkboxes */}
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
        {/* <div className="flex items-center gap-2">
          <Checkbox
            id={`stackable-${candidate.skillId}`}
            checked={candidate.isStackable}
            onCheckedChange={handleStackableChange}
          />
          <Label
            htmlFor={`stackable-${candidate.skillId}`}
            className="text-xs cursor-pointer font-normal"
          >
            Can buy twice
          </Label>
        </div> */}
      </div>

      {/* Cost Display */}
      <div className="flex justify-between items-center pt-2 border-t text-xs">
        <span className="text-muted-foreground">
          {candidate.isObtained ? 'Cost (free):' : 'Cost:'}
        </span>
        <span className={`font-medium ${candidate.isObtained ? 'text-green-600' : ''}`}>
          {candidate.isObtained ? '0' : candidate.effectiveCost} pts
        </span>
      </div>
    </div>
  );
}
