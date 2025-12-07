#!/usr/bin/env tsx

/* eslint-disable react-refresh/only-export-components */

import React, { useState } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import Spinner from 'ink-spinner';
import TextInput from 'ink-text-input';

// Import your sync functions
import { syncSkills, FilterConfig } from './sync-skills';

interface SyncState {
  charId: string;
  dryRun: boolean;
  isProcessing: boolean;
  isDone: boolean;
  error: string | null;
  stats: {
    mainSkills: number;
    geneSkills: number;
    total: number;
    skillIds?: number[];
    skillNames?: Array<{ id: number; name: string }>;
    dryRun?: boolean;
  } | null;
}

const App = () => {
  const { exit } = useApp();
  const [state, setState] = useState<SyncState>({
    charId: '',
    dryRun: false,
    isProcessing: false,
    isDone: false,
    error: null,
    stats: null,
  });

  const [stage, setStage] = useState<'input-char' | 'confirm' | 'processing'>(
    'input-char',
  );

  const handleSync = async () => {
    setState((prev) => ({ ...prev, isProcessing: true, error: null }));
    setStage('processing');

    try {
      const charId = parseInt(state.charId);

      if (isNaN(charId)) {
        throw new Error('Invalid outfit ID. Please enter a number.');
      }

      const config: FilterConfig = {
        dryRun: state.dryRun,
        specificCharId: charId,
      };

      const result = await syncSkills(config);

      setState((prev) => ({
        ...prev,
        isProcessing: false,
        isDone: true,
        stats: result,
      }));

      // Don't auto-exit after dry run
      if (!state.dryRun) {
        setTimeout(() => exit(), 3000);
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      setStage('confirm'); // Go back to confirm so user can try again
    }
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
              Enter outfit ID to sync skills from that specific character
            </Text>
          </Box>
          <Box marginBottom={1} marginTop={1}>
            <Box>
              <Text>Outfit ID: </Text>
              <TextInput
                value={state.charId}
                onChange={(value) =>
                  setState((prev) => ({ ...prev, charId: value }))
                }
                onSubmit={() => setStage('confirm')}
                placeholder="e.g. 106801"
              />
            </Box>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Will sync ONLY skills from outfit {state.charId || 'N'}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text dimColor>
              Examples: 100101 (Special Week), 106801 (Kitasan Black)
            </Text>
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
              Outfit ID: <Text color="yellow">{state.charId}</Text>
            </Text>
          </Box>

          <Box marginBottom={1}>
            <Text>
              Dry Run:{' '}
              {state.dryRun ? (
                <Text color="cyan" bold>
                  ON (preview only)
                </Text>
              ) : (
                <Text color="magenta">OFF (will write files)</Text>
              )}
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
                Press <Text bold>ENTER</Text> to{' '}
                {state.dryRun ? 'preview' : 'sync'}
              </Text>
            </Box>
            <Box>
              <Text dimColor>
                <Text bold>D</Text> toggle dry run • <Text bold>B</Text> go back
                • <Text bold>ESC</Text> cancel
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
                {state.stats.skillNames.slice(0, 15).map((skill) => (
                  <Box key={skill.id}>
                    <Text dimColor>
                      {skill.id}: <Text color="cyan">{skill.name}</Text>
                    </Text>
                  </Box>
                ))}
                {state.stats.skillNames.length > 15 && (
                  <Box marginTop={1}>
                    <Text dimColor>
                      ... and {state.stats.skillNames.length - 15} more skills
                    </Text>
                  </Box>
                )}
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
