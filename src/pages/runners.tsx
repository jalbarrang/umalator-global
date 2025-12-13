import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { SavedRunnerCard } from '@/modules/runners/components/saved-runner-card';
import { RunnerEditorDialog } from '@/modules/runners/components/runner-editor-dialog';
import {
  useRunnerLibraryStore,
  SavedRunner,
} from '@/store/runner-library.store';
import { Plus, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { loadRunnerFromLibrary, showRunner } from '@/store/runners.store';
import { useNavigate } from 'react-router';

const RunnersPage = () => {
  const navigate = useNavigate();
  const { runners, addRunner, updateRunner, deleteRunner, duplicateRunner } =
    useRunnerLibraryStore();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingRunner, setEditingRunner] = useState<SavedRunner | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [runnerToDelete, setRunnerToDelete] = useState<string | null>(null);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [runnerToLoad, setRunnerToLoad] = useState<SavedRunner | null>(null);

  const handleAddNew = () => {
    setEditingRunner(null);
    setEditorOpen(true);
  };

  const handleEdit = (runner: SavedRunner) => {
    setEditingRunner(runner);
    setEditorOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setRunnerToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (runnerToDelete) {
      deleteRunner(runnerToDelete);
      setRunnerToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleLoadClick = (runner: SavedRunner) => {
    setRunnerToLoad(runner);
    setLoadDialogOpen(true);
  };

  const handleLoadToSlot = (slot: 'uma1' | 'uma2') => {
    if (runnerToLoad) {
      loadRunnerFromLibrary(slot, runnerToLoad);
      showRunner(slot);
      setLoadDialogOpen(false);
      setRunnerToLoad(null);
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col flex-1 p-4 gap-4 overflow-y-auto min-h-0">
      {/* Header */}
      <div className="flex items-center justify-end p-2 border-b">
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Runner
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {runners.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>No runners saved</EmptyTitle>
              <EmptyDescription>
                Create your first runner to get started
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add Runner
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
            {runners.map((runner) => (
              <SavedRunnerCard
                key={runner.id}
                runner={runner}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onDuplicate={duplicateRunner}
                onLoadToSimulation={handleLoadClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Editor Dialog */}
      <RunnerEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        runner={editingRunner}
        onSave={addRunner}
        onUpdate={updateRunner}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Runner</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this runner? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load to Simulation Dialog */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Runner to Simulation</DialogTitle>
            <DialogDescription>
              Choose which simulation slot to load this runner into.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="h-20"
              onClick={() => handleLoadToSlot('uma1')}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-[#2a77c5]">
                  Uma 1
                </div>
                <div className="text-sm text-muted-foreground">Blue slot</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="h-20"
              onClick={() => handleLoadToSlot('uma2')}
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-[#c52a2a]">
                  Uma 2
                </div>
                <div className="text-sm text-muted-foreground">Red slot</div>
              </div>
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Default export so we can use lazy import in the router
export default RunnersPage;
