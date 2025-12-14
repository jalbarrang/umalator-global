import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { RunnerCard } from '@/modules/runners/components/runner-card/runner-card';
import { RunnerState } from '@/modules/runners/components/runner-card/types';
import { SkillPickerModal } from '@/modules/skills/components/skill-list/SkillList';
import { SkillPickerContent } from '@/modules/skills/components/skill-picker-content';
import { updateCurrentSkills } from '@/modules/skills/store';
import { getSelectableSkillsForUma } from '@/modules/skills/utils';
import { useMemo } from 'react';

type RunnerEditorLayoutProps = {
  runnerName: string;
  runnerState: RunnerState;
  onRunnerNameChange: (name: string) => void;
  onRunnerStateChange: (state: RunnerState) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditMode: boolean;
};

export const RunnerEditorLayout = ({
  runnerName,
  runnerState,
  onRunnerNameChange,
  onRunnerStateChange,
  onSave,
  onCancel,
  isEditMode,
}: RunnerEditorLayoutProps) => {
  const isMobile = useIsMobile();

  const selectableSkills = useMemo(
    () => getSelectableSkillsForUma(runnerState.outfitId),
    [runnerState.outfitId],
  );

  const handleSetSkills = (skills: string[]) => {
    onRunnerStateChange({ ...runnerState, skills });
    updateCurrentSkills(skills);
  };

  const handleRunnerChange = (newState: RunnerState) => {
    onRunnerStateChange(newState);
    updateCurrentSkills(newState.skills);
  };

  return (
    <div className="flex flex-col flex-1">
      {/* Header with title and actions */}
      <div className="flex items-center justify-between p-4 border-b shrink-0">
        <h1 className="text-2xl font-bold">
          {isEditMode ? 'Edit Runner' : 'Register Runner'}
        </h1>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onSave}>{isEditMode ? 'Update' : 'Create'}</Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1">
        {isMobile ? (
          /* Mobile layout: Single column with modal */
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Runner Name Input */}
              <div className="space-y-2">
                <Label htmlFor="runner-name">Runner Name *</Label>
                <Input
                  id="runner-name"
                  value={runnerName}
                  onChange={(e) => onRunnerNameChange(e.target.value)}
                  placeholder="Enter runner name..."
                  autoFocus
                />
              </div>

              {/* Runner Configuration */}
              <div className="border rounded-lg p-2">
                <RunnerCard
                  value={runnerState}
                  runnerId="editor"
                  onChange={handleRunnerChange}
                  onReset={() => {}}
                  onCopy={() => {}}
                  onSwap={() => {}}
                />
              </div>
            </div>

            {/* Skill picker modal for mobile */}
            <SkillPickerModal />
          </div>
        ) : (
          /* Desktop layout: Two columns */
          <div className="grid grid-cols-6 w-full">
            {/* Left column: Runner Editor */}
            <div className="col-span-2 overflow-y-auto p-4 border-r">
              <div className="flex flex-col gap-4">
                {/* Runner Name Input */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="runner-name">Runner Notes</Label>
                  <Input
                    id="runner-name"
                    value={runnerName}
                    onChange={(e) => onRunnerNameChange(e.target.value)}
                    placeholder="Enter runner notes..."
                    autoFocus
                  />
                </div>

                {/* Runner Configuration */}
                <div className="border rounded-lg p-2">
                  <RunnerCard
                    value={runnerState}
                    runnerId="editor"
                    onChange={handleRunnerChange}
                    onReset={() => {}}
                    onCopy={() => {}}
                    onSwap={() => {}}
                    hideSkillButton={true}
                  />
                </div>
              </div>
            </div>

            {/* Right column: Inline Skill Picker */}
            <div className="col-span-4 p-4 flex flex-col gap-4">
              <h2 className="text-lg font-semibold">Skills</h2>

              <SkillPickerContent
                umaId={runnerState.outfitId}
                options={selectableSkills}
                currentSkills={runnerState.skills}
                onSelect={handleSetSkills}
                hideSelected
                className="flex-1"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
