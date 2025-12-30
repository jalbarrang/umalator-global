import { PlusIcon, TrashIcon } from 'lucide-react';
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
import { useSkillModalStore } from '@/modules/skills/store';
import { useRunner } from '@/store/runners.store';

interface CandidateSkillListProps {
  onImportClick?: () => void;
}

export function CandidateSkillList({ onImportClick: _onImportClick }: CandidateSkillListProps) {
  const { candidates } = useSkillPlannerStore();
  const { runner } = useRunner();

  const handleAddSkill = () => {
    useSkillModalStore.setState({
      open: true,
      umaId: runner.outfitId || undefined,
      currentSkills: runner.skills,
      onSelect: () => {
        // This will be handled by the SkillPlanner component's useEffect
      },
    });
  };

  const candidateList = Array.from(candidates.values());

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleAddSkill} size="sm" className="w-full">
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Skill
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Select skills you want to consider purchasing, then set their hint levels below.
      </p>

      {/* Candidate List */}
      <div className="flex-1 overflow-y-auto">
        {candidateList.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p className="text-sm">No candidate skills added yet.</p>
            <p className="text-xs mt-2">Click "Add Skill" to get started.</p>
          </div>
        ) : (
          <div className="space-y-2 pr-4">
            {candidateList.map((candidate) => (
              <CandidateSkillItem key={candidate.skillId} candidate={candidate} />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {candidateList.length > 0 && (
        <div className="border-t pt-2 text-sm text-muted-foreground">
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
      )}
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

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-card">
      {/* Skill Name and Remove Button */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-medium text-sm">{skillName}</p>
          <p className="text-xs text-muted-foreground">ID: {candidate.skillId}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleRemove} className="h-8 w-8 p-0">
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>

      {/* Hint Level Selector */}
      <div className="grid grid-cols-2 gap-2 items-center">
        <Label htmlFor={`hint-${candidate.skillId}`} className="text-xs">
          Hint Level
        </Label>
        <Select
          value={candidate.hintLevel.toString()}
          onValueChange={handleHintLevelChange}
        >
          <SelectTrigger id={`hint-${candidate.skillId}`} className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0 (No hint)</SelectItem>
            <SelectItem value="1">1 (10% off)</SelectItem>
            <SelectItem value="2">2 (20% off)</SelectItem>
            <SelectItem value="3">3 (30% off)</SelectItem>
            <SelectItem value="4">4 (35% off)</SelectItem>
            <SelectItem value="5">5 (40% off)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Checkboxes */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`obtained-${candidate.skillId}`}
            checked={candidate.isObtained}
            onCheckedChange={handleObtainedChange}
          />
          <Label
            htmlFor={`obtained-${candidate.skillId}`}
            className="text-xs cursor-pointer font-normal"
          >
            Already Obtained (free)
          </Label>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
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

