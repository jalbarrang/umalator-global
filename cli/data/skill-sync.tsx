#!/usr/bin/env tsx
import { useMemo, useState } from 'react';
import { Box, Text, render, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';
import MultiSelect from '../components/MultiSelect';
import { syncSkills } from './sync-skills';
import type { ListedItem } from '../components/MultiSelect';

// Import your sync functions
import type { FilterConfig } from './sync-skills';

interface SyncState {
  charId: string;
  charIds: Array<number>;
  dryRun: boolean;
  isProcessing: boolean;
  isDone: boolean;
  error: string | null;
  stats: {
    mainSkills: number;
    geneSkills: number;
    total: number;
    skillIds?: Array<number>;
    skillNames?: Array<{ id: number; name: string }>;
    dryRun?: boolean;
  } | null;
}

const App = () => {
  const { exit } = useApp();
  const [state, setState] = useState<SyncState>({
    charId: '',
    charIds: [],
    dryRun: false,
    isProcessing: false,
    isDone: false,
    error: null,
    stats: null,
  });

  const [availableSkills, setAvailableSkills] = useState<
    Array<{ id: number; name: string }>
  >([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<
    Array<{ value: number; label: string }>
  >([]);

  const skillOptions = useMemo(() => {
    return availableSkills.map((skill) => ({
      label: skill.name,
      value: skill.id,
    }));
  }, [availableSkills]);

  const [stage, setStage] = useState<
    'input-char' | 'confirm' | 'skill-selection' | 'processing'
  >('input-char');

  const handleSync = async () => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }));
    setStage('processing');

    try {
      // First pass: Fetch skills (dry run)
      if (stage === 'confirm') {
        const config: FilterConfig = {
          dryRun: true,
          specificCharIds: state.charIds,
        };

        const result = await syncSkills(config);

        setAvailableSkills(
          Array.from(result.processedSkills.values()).toSorted(
            (a, b) => a.id - b.id,
          ),
        );
        setSelectedSkillIds(
          Array.from(result.processedSkills.values()).map((s) => ({
            value: s.id,
            label: s.name,
          })),
        );

        // Update state with available skills
        setState((prev) => ({
          ...prev,
          isProcessing: false,
          stats: result,
        }));

        // Reset highlighted index and go to selection stage
        setStage('skill-selection');
      }
      // Second pass: Sync selected skills
      else if (stage === 'skill-selection') {
        const config: FilterConfig = {
          dryRun: false,
          includeIds: selectedSkillIds.map((s) => s.value),
        };

        const result = await syncSkills(config);

        setState((prev) => ({
          ...prev,
          isProcessing: false,
          isDone: true,
          stats: result,
        }));

        // Auto-exit after sync
        setTimeout(() => exit(), 3000);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      // Go back to previous stage
      setStage(stage === 'skill-selection' ? 'skill-selection' : 'confirm');
    }
  };

  const handleOnSelect = (selected: ListedItem) => {
    setSelectedSkillIds((prev) => {
      const newSelected = [...prev];
      newSelected.push({
        value: Number(selected.value),
        label: selected.label,
      });

      return newSelected;
    });
  };

  const handleOnUnselect = (unselected: ListedItem) => {
    setSelectedSkillIds((prev) => {
      return prev.filter((s) => s.value !== Number(unselected.value));
    });
  };

  // Input handlers
  useInput((input, key) => {
    if (key.escape) {
      exit();
    }

    // FIXED: Add ENTER handler for confirm stage
    if (key.return && stage === 'confirm' && !state.isProcessing) {
      handleSync();
    }

    // Toggle dry run with 'D' key
    if (
      (input === 'd' || input === 'D') &&
      stage === 'confirm' &&
      !state.isProcessing
    ) {
      setState((prev) => ({ ...prev, dryRun: !prev.dryRun }));
    }

    // After dry run, allow user to proceed with actual sync with 'P' key
    if (
      (input === 'p' || input === 'P') &&
      state.isDone &&
      state.stats?.dryRun
    ) {
      setState((prev) => ({
        ...prev,
        dryRun: false,
        isDone: false,
        stats: null,
      }));
      setStage('confirm');
    }

    // Add back button
    if (input === 'b' && stage === 'confirm' && !state.isProcessing) {
      setStage('input-char');
      setState((prev) => ({
        ...prev,
        error: null,
        dryRun: false,
      }));
    }

    // Skill selection stage handlers
    if (stage === 'skill-selection') {
      // Select all / Deselect all with 'A'
      if (input === 'a' || input === 'A') {
        setSelectedSkillIds((prev) => {
          const allSelected = availableSkills.every((skill) =>
            prev.some((s) => s.value === skill.id),
          );
          if (allSelected) {
            // Deselect all
            return [];
          } else {
            // Select all
            return availableSkills.map((s) => ({
              value: s.id,
              label: s.name,
            }));
          }
        });
      }

      // Proceed with selected skills
      if (key.return) {
        if (selectedSkillIds.length === 0) {
          setState((prev) => ({
            ...prev,
            error: 'Please select at least one skill to sync',
          }));
        } else {
          handleSync();
        }
      }

      // Go back
      if (input === 'b') {
        setStage('confirm');
        setState((prev) => ({
          ...prev,
          error: null,
        }));
      }
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          ⚡ Umalator Skill Data Sync Utility
        </Text>
      </Box>

      {stage === 'input-char' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>Sync Character Skills by OutfitID</Text>
          </Box>
          <Box marginBottom={1}>
            <Text dimColor>
              Enter outfit ID(s) to sync skills (comma-separated for multiple)
            </Text>
          </Box>
          <Box marginBottom={1} marginTop={1}>
            <Box>
              <Text>Outfit ID(s): </Text>
              <TextInput
                value={state.charId}
                onChange={(value) =>
                  setState((prev) => ({ ...prev, charId: value }))
                }
                onSubmit={() => {
                  // Parse and validate character IDs
                  const ids = state.charId
                    .split(',')
                    .map((id) => id.trim())
                    .filter((id) => id !== '')
                    .map((id) => parseInt(id))
                    .filter((id) => !isNaN(id));

                  if (ids.length === 0) {
                    setState((prev) => ({
                      ...prev,
                      error: 'Please enter at least one valid outfit ID',
                    }));
                  } else {
                    setState((prev) => ({
                      ...prev,
                      charIds: ids,
                      error: null,
                    }));
                    setStage('confirm');
                  }
                }}
                placeholder="e.g. 100101, 106801, 100301"
              />
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Will sync skills from outfit(s): {state.charId || 'N/A'}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Examples: 100101 (Special Week), 106801 (Kitasan Black)
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Multiple IDs: 100101, 106801, 100301</Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>Press ESC to exit</Text>
          </Box>
        </Box>
      )}

      {stage === 'confirm' && !state.isProcessing && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>Confirm sync settings:</Text>
          </Box>
          <Box marginBottom={1}>
            <Text>
              Outfit ID(s): <Text color="yellow">{state.charId}</Text>
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text>
              Number of characters:{' '}
              <Text color="cyan">{state.charIds.length}</Text>
            </Text>
          </Box>

          {state.error && (
            <Box marginTop={1} marginBottom={1}>
              <Text color="red">⚠ {state.error}</Text>
            </Box>
          )}

          <Box marginTop={1} flexDirection="column">
            <Box marginBottom={1}>
              <Text>
                Press <Text bold>ENTER</Text> to fetch skills
              </Text>
            </Box>
            <Box>
              <Text dimColor>
                <Text bold>B</Text> go back • <Text bold>ESC</Text> cancel
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {stage === 'skill-selection' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold>Select skills to sync:</Text>
          </Box>

          <Box marginBottom={1}>
            <Text>
              Selected: <Text color="cyan">{selectedSkillIds.length}</Text> /{' '}
              {availableSkills.length}
            </Text>
          </Box>

          {state.error && (
            <Box marginBottom={1}>
              <Text color="red">⚠ {state.error}</Text>
            </Box>
          )}

          <MultiSelect
            items={skillOptions}
            selected={selectedSkillIds}
            onSelect={handleOnSelect}
            onUnselect={handleOnUnselect}
          />

          <Box marginTop={1} flexDirection="column">
            <Box marginBottom={1}>
              <Text>
                Press <Text bold>ENTER</Text> to sync selected skills
              </Text>
            </Box>
            <Box>
              <Text dimColor>
                <Text bold>SPACE</Text> toggle • <Text bold>↑↓</Text> navigate •{' '}
                <Text bold>A</Text> select all • <Text bold>B</Text> go back •{' '}
                <Text bold>ESC</Text> cancel
              </Text>
            </Box>
          </Box>
        </Box>
      )}

      {stage === 'processing' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="cyan">
              <Spinner type="dots" />{' '}
              {state.dryRun ? 'Analyzing skills...' : 'Syncing skills...'}
            </Text>
          </Box>
        </Box>
      )}

      {state.isDone && state.stats && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color={state.stats.dryRun ? 'cyan' : 'green'} bold>
              {state.stats.dryRun
                ? '🔍 Dry Run Preview'
                : '✓ Sync completed successfully!'}
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text>
              {state.stats.dryRun ? 'Would sync' : 'Synced'} main skills:{' '}
              <Text color="cyan">{state.stats.mainSkills}</Text>
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text>
              {state.stats.dryRun ? 'Would sync' : 'Synced'} gene skills:{' '}
              <Text color="cyan">{state.stats.geneSkills}</Text>
            </Text>
          </Box>
          <Box marginBottom={1}>
            <Text>
              Total:{' '}
              <Text color={state.stats.dryRun ? 'cyan' : 'green'} bold>
                {state.stats.total}
              </Text>
            </Text>
          </Box>

          {state.stats.skillNames && state.stats.skillNames.length > 0 && (
            <Box marginTop={1} marginBottom={1} flexDirection="column">
              <Box marginBottom={1}>
                <Text bold>Skills to sync:</Text>
              </Box>
              <Box flexDirection="column">
                {state.stats.skillNames.map((skill) => (
                  <Box key={skill.id}>
                    <Text dimColor>
                      {skill.id}: <Text color="cyan">{skill.name}</Text>
                    </Text>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {state.stats.dryRun ? (
            <Box marginTop={1} flexDirection="column">
              <Box marginBottom={1}>
                <Text color="yellow">
                  ⚠ No files were written (dry run mode)
                </Text>
              </Box>
              <Box>
                <Text dimColor>
                  Press <Text bold>P</Text> to proceed with actual sync • Press{' '}
                  <Text bold>ESC</Text> to exit
                </Text>
              </Box>
            </Box>
          ) : (
            <Box marginTop={1}>
              <Text dimColor>Exiting in 3 seconds...</Text>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// Run the CLI
render(<App />);
