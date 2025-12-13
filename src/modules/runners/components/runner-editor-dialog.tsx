import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SavedRunner } from '@/store/runner-library.store';
import { RunnerCard } from './runner-card/runner-card';
import { createRunnerState, RunnerState } from './runner-card/types';

type RunnerEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runner?: SavedRunner | null;
  onSave: (runner: Omit<SavedRunner, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdate?: (id: string, updates: Partial<SavedRunner>) => void;
};

export const RunnerEditorDialog = ({
  open,
  onOpenChange,
  runner,
  onSave,
  onUpdate,
}: RunnerEditorDialogProps) => {
  const isEditMode = !!runner;

  const [runnerName, setRunnerName] = useState('');
  const [runnerState, setRunnerState] =
    useState<RunnerState>(createRunnerState());

  // Initialize state when dialog opens or runner changes
  useEffect(() => {
    if (runner) {
      setRunnerName(runner.notes);
      setRunnerState(runner);
    } else {
      setRunnerName('');
      setRunnerState(createRunnerState());
    }
  }, [runner, open]);

  const handleSave = () => {
    if (!runnerName.trim()) {
      return;
    }

    if (isEditMode && runner && onUpdate) {
      onUpdate(runner.id, {
        ...runnerState,
        notes: runnerName.trim(),
      });
    } else {
      onSave({
        ...runnerState,
        notes: runnerName.trim(),
      });
    }

    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Runner' : 'Create New Runner'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Runner Name Input */}
          <div className="space-y-2">
            <Label htmlFor="runner-name">Runner Name *</Label>
            <Input
              id="runner-name"
              value={runnerName}
              onChange={(e) => setRunnerName(e.target.value)}
              placeholder="Enter runner name..."
              autoFocus
            />
          </div>

          {/* Runner Configuration */}
          <div className="border rounded-lg p-2">
            <RunnerCard
              value={runnerState}
              courseDistance={2000}
              runnerId="editor"
              onChange={setRunnerState}
              onReset={() => setRunnerState(createRunnerState())}
              onCopy={() => {}}
              onSwap={() => {}}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!runnerName.trim()}>
            {isEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
