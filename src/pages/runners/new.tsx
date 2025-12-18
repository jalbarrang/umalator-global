import { useState } from 'react';
import { useNavigate } from 'react-router';
import { RunnerEditorLayout } from './runner-editor-layout';
import { createRunnerState } from '@/modules/runners/components/runner-card/types';
import { useRunnerLibraryStore } from '@/store/runner-library.store';

const NewRunnerPage = () => {
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

    navigate('/runners');
  };

  const handleCancel = () => {
    navigate('/runners');
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
};

export default NewRunnerPage;
