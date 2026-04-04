// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DebuffsPanel } from './DebuffsPanel';
import { useRaceStore } from '@/modules/simulation/stores/compare.store';
import { runawaySkillId } from '@/modules/runners/components/runner-card/types';

const initialDebuffsState = {
  uma1: [{ id: 'debuff-1', skillId: runawaySkillId, position: 100 }],
  uma2: [],
};

function resetDebuffs() {
  localStorage.clear();
  useRaceStore.setState({ injectedDebuffs: { uma1: [], uma2: [] } });
}

describe('DebuffsPanel', () => {
  beforeEach(() => {
    resetDebuffs();
    useRaceStore.setState({ injectedDebuffs: initialDebuffsState });
  });

  afterEach(() => {
    cleanup();
    resetDebuffs();
  });

  it('updates an injected debuff position from the inline input', () => {
    render(<DebuffsPanel />);

    const input = screen.getByRole('spinbutton', { name: /position$/i });
    expect(input).toHaveValue(100);

    fireEvent.change(input, { target: { value: '140' } });

    expect(useRaceStore.getState().injectedDebuffs.uma1[0]?.position).toBe(140);
  });

  it('removes an injected debuff from the dismiss action', () => {
    render(<DebuffsPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove skill' }));

    expect(useRaceStore.getState().injectedDebuffs.uma1).toHaveLength(0);
  });
});
