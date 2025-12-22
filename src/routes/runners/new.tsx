import { createFileRoute, useNavigate } from '@tanstack/react-router';

import { useState } from 'react';
import { RunnerEditorLayout } from '@/layout/runner-editor-layout';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import { useRunnerLibraryStore } from '@/store/runner-library.store';

export const Route = createFileRoute('/runners/new')({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { addRunner } = useRunnerLibraryStore();

  const [runnerName, setRunnerName] = useState('');
  const [runnerState, setRunnerState] = useState(createRunnerState());

  const handleSave = () => {
    if (!runnerName.trim()) {
      return;
    }

    addRunner({
      ...runnerState,
      notes: runnerName.trim(),
    });

    navigate({ to: '/runners' });
  };

  const handleCancel = () => {
    navigate({ to: '/runners' });
  };

  return (
    <RunnerEditorLayout
      runnerName={runnerName}
      runnerState={runnerState}
      onRunnerNameChange={setRunnerName}
      onRunnerStateChange={setRunnerState}
      onSave={handleSave}
      onCancel={handleCancel}
      isEditMode={false}
    />
  );
}
