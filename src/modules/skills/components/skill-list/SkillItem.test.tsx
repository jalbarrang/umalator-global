// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SkillCostDetails } from '../cost-details';
import { runawaySkillId } from '@/modules/runners/components/runner-card/types';
import { SkillItem } from './SkillItem';
import { SkillItemProvider } from './skill-item.provider';
import type { SkillCostSummary } from '@/modules/skills/skill-cost-summary';

afterEach(() => {
  cleanup();
});

const createCostSummary = (overrides: Partial<SkillCostSummary> = {}): SkillCostSummary => ({
  baseTotal: 224,
  netTotal: 120,
  isObtained: false,
  exactDiscountPct: 46.4,
  roundedDiscountPct: 46,
  ...overrides,
});

describe('SkillItem cost summary UI', () => {
  it('renders rounded aggregate discount and net cost in the row', () => {
    render(<SkillItem skillId={runawaySkillId} costSummary={createCostSummary()} />);

    expect(screen.getByText('46% off')).toBeInTheDocument();
    expect(screen.getByText('120 SP')).toBeInTheDocument();
  });

  it('hides the discount label when rounded discount is zero', () => {
    render(
      <SkillItem
        skillId={runawaySkillId}
        costSummary={createCostSummary({ exactDiscountPct: 0, roundedDiscountPct: 0 })}
      />,
    );

    expect(screen.queryByText(/% off$/)).toBeNull();
    expect(screen.getByText('120 SP')).toBeInTheDocument();
  });

  it('shows obtained state instead of discount and net cost', () => {
    render(
      <SkillItem
        skillId={runawaySkillId}
        costSummary={createCostSummary({ isObtained: true, netTotal: 0 })}
      />,
    );

    expect(screen.getByText('Obtained')).toBeInTheDocument();
    expect(screen.queryByText('46% off')).toBeNull();
    expect(screen.queryByText('120 SP')).toBeNull();
  });

  it('renders inline accessory content and uses a custom dismiss handler', () => {
    const onDismiss = vi.fn();

    render(
      <SkillItem
        skillId={runawaySkillId}
        dismissable
        interactive={false}
        onDismiss={onDismiss}
        accessory={<input type="number" aria-label="Debuff position" defaultValue={120} />}
      />,
    );

    expect(screen.getByRole('spinbutton', { name: 'Debuff position' })).toHaveDisplayValue('120');
    expect(document.querySelector('[data-event="select-skill"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Remove skill' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('SkillCostDetails aggregate discount UI', () => {
  it('renders exact aggregate discount with one decimal place', () => {
    render(
      <SkillItemProvider skillId={runawaySkillId} costSummary={createCostSummary()}>
        <SkillCostDetails />
      </SkillItemProvider>,
    );

    expect(screen.getByText('Aggregate Base')).toBeInTheDocument();
    expect(screen.getByText('224 SP')).toBeInTheDocument();
    expect(screen.getByText('Aggregate Net')).toBeInTheDocument();
    expect(screen.getByText('120 SP')).toBeInTheDocument();
    expect(screen.getByText('46.4%')).toBeInTheDocument();
  });
});
