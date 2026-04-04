// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SkillCostDetails } from '../cost-details';
import { runawaySkillId } from '@/modules/runners/components/runner-card/types';
import {
  SkillItemAccessory,
  SkillItemActions,
  SkillItemBody,
  SkillItemCostAction,
  SkillItemDetailsActions,
  SkillItemIdentity,
  SkillItem,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
} from './skill-item';
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

function SummarySkillRow({ dismissable = false, onDismiss }: Readonly<{ dismissable?: boolean; onDismiss?: () => void }>) {
  return (
    <SkillItemRoot size="summary">
      <SkillItemRail />
      <SkillItemBody className="flex-col gap-2">
        <SkillItemMain className="p-1 px-2">
          <SkillItemIdentity />
          <SkillItemDetailsActions dismissable={dismissable} onDismiss={onDismiss} className="shrink-0" />
        </SkillItemMain>
        <SkillItemCostAction layout="summary" />
      </SkillItemBody>
    </SkillItemRoot>
  );
}

function AccessorySkillRow({
  accessory,
  onDismiss,
  onClick,
}: Readonly<{
  accessory: React.ReactNode;
  onDismiss?: () => void;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}>) {
  return (
    <SkillItemRoot interactive={false} onClick={onClick}>
      <SkillItemRail />
      <SkillItemBody className="p-1 px-2">
        <SkillItemMain>
          <SkillItemIdentity />
          <SkillItemAccessory className="w-[112px]">{accessory}</SkillItemAccessory>
          <SkillItemActions>
            <SkillItemDetailsActions dismissable={Boolean(onDismiss)} onDismiss={onDismiss} />
          </SkillItemActions>
        </SkillItemMain>
      </SkillItemBody>
    </SkillItemRoot>
  );
}

describe('SkillItem cost summary UI', () => {
  it('renders rounded aggregate discount and net cost in the row', () => {
    render(
      <SkillItem skillId={runawaySkillId} costSummary={createCostSummary()}>
        <SummarySkillRow />
      </SkillItem>,
    );

    expect(screen.getByText('46% off')).toBeInTheDocument();
    expect(screen.getByText('120 SP')).toBeInTheDocument();
  });

  it('hides the discount label when rounded discount is zero', () => {
    render(
      <SkillItem
        skillId={runawaySkillId}
        costSummary={createCostSummary({ exactDiscountPct: 0, roundedDiscountPct: 0 })}
      >
        <SummarySkillRow />
      </SkillItem>,
    );

    expect(screen.queryByText(/% off$/)).toBeNull();
    expect(screen.getByText('120 SP')).toBeInTheDocument();
  });

  it('shows obtained state instead of discount and net cost', () => {
    render(
      <SkillItem
        skillId={runawaySkillId}
        costSummary={createCostSummary({ isObtained: true, netTotal: 0 })}
      >
        <SummarySkillRow />
      </SkillItem>,
    );

    expect(screen.getByText('Obtained')).toBeInTheDocument();
    expect(screen.queryByText('46% off')).toBeNull();
    expect(screen.queryByText('120 SP')).toBeNull();
  });

  it('renders inline accessory content and uses a custom dismiss handler', () => {
    const onDismiss = vi.fn();

    render(
      <SkillItem skillId={runawaySkillId}>
        <AccessorySkillRow
          onDismiss={onDismiss}
          accessory={<input type="number" aria-label="Debuff position" defaultValue={120} />}
        />
      </SkillItem>,
    );

    expect(screen.getByRole('spinbutton', { name: 'Debuff position' })).toHaveDisplayValue('120');
    expect(document.querySelector('[data-event="select-skill"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Remove skill' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('lets accessory controls handle clicks without triggering the row', () => {
    const onRowClick = vi.fn();
    const onAccessoryClick = vi.fn();

    render(
      <SkillItem skillId={runawaySkillId}>
        <AccessorySkillRow
          onClick={onRowClick}
          accessory={
            <button type="button" onClick={onAccessoryClick}>
              Accessory action
            </button>
          }
        />
      </SkillItem>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Accessory action' }));

    expect(onAccessoryClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('provides context to lower-level compound children', () => {
    const onDismiss = vi.fn();

    render(
      <SkillItem skillId={runawaySkillId}>
        <AccessorySkillRow
          onDismiss={onDismiss}
          accessory={<input type="number" aria-label="Forced position" defaultValue={90} />}
        />
      </SkillItem>,
    );

    expect(screen.getByRole('spinbutton', { name: 'Forced position' })).toHaveDisplayValue('90');
    expect(document.querySelector('[data-event="select-skill"]')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Remove skill' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('SkillCostDetails aggregate discount UI', () => {
  it('renders exact aggregate discount with one decimal place', () => {
    render(
      <SkillItem skillId={runawaySkillId} costSummary={createCostSummary()}>
        <SkillCostDetails />
      </SkillItem>,
    );

    expect(screen.getByText('Aggregate Base')).toBeInTheDocument();
    expect(screen.getByText('224 SP')).toBeInTheDocument();
    expect(screen.getByText('Aggregate Net')).toBeInTheDocument();
    expect(screen.getByText('120 SP')).toBeInTheDocument();
    expect(screen.getByText('46.4%')).toBeInTheDocument();
  });
});
