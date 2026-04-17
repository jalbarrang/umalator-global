// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { getSkills } from '@/modules/data/skills';
import { SkillPickerContent } from './content';
import { SkillPickerProvider } from './provider';

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({
    count,
    estimateSize,
  }: {
    count: number;
    estimateSize: () => number;
  }) => ({
    getTotalSize: () => count * estimateSize(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => {
        const size = estimateSize();

        return {
          index,
          key: index,
          size,
          start: index * size,
          end: (index + 1) * size,
          lane: 0,
        };
      }),
    scrollToIndex: vi.fn(),
  }),
}));

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const getOptionIds = (count = 3) =>
  getSkills()
    .filter((skill) => skill.name.length > 0 && skill.iconId.length > 0)
    .slice(0, count)
    .map((skill) => skill.id);

const getSelectableRows = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-event="select-skill"]'));

const getHighlightedRows = () => getSelectableRows().filter((row) => row.dataset.highlighted === 'true');

const keyCodes: Record<string, number> = {
  ArrowDown: 40,
  ArrowUp: 38,
  ArrowLeft: 37,
  ArrowRight: 39,
  Enter: 13,
  Escape: 27,
};

const pressHotkey = (target: HTMLElement, key: keyof typeof keyCodes) => {
  fireEvent.keyDown(target, {
    key,
    code: key,
    keyCode: keyCodes[key],
    which: keyCodes[key],
    bubbles: true,
    cancelable: true,
  });
};

describe('SkillPickerContent keyboard navigation', () => {
  it('keeps search focused while arrows enter browse mode and Enter selects on mobile', () => {
    const optionIds = getOptionIds();
    const onSelect = vi.fn();
    const pickerRef = createRef<{ focus: () => void } | null>();

    render(
      <SkillPickerProvider>
        <SkillPickerContent
          ref={pickerRef}
          umaId={undefined}
          options={optionIds}
          currentSkills={[]}
          onSelect={onSelect}
          columnCount={1}
        />
      </SkillPickerProvider>,
    );

    const searchInput = screen.getByPlaceholderText('Search skill by name');
    searchInput.focus();

    let rows = getSelectableRows();
    expect(rows).toHaveLength(optionIds.length);
    expect(getHighlightedRows()).toHaveLength(0);
    expect(searchInput).toHaveFocus();

    act(() => {
      pressHotkey(searchInput, 'ArrowDown');
    });

    rows = getSelectableRows();
    expect(searchInput).toHaveFocus();
    expect(rows[0]).toHaveAttribute('data-highlighted', 'true');

    act(() => {
      pressHotkey(searchInput, 'ArrowDown');
    });

    rows = getSelectableRows();
    expect(rows[1]).toHaveAttribute('data-highlighted', 'true');

    act(() => {
      pressHotkey(searchInput, 'Enter');
    });

    expect(searchInput).toHaveFocus();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([optionIds[1]]);
  });

  it('uses browse mode, grid-aware navigation, and escape to return to search on desktop', () => {
    const optionIds = getOptionIds(8);
    const onSelect = vi.fn();
    const pickerRef = createRef<{ focus: () => void } | null>();

    render(
      <SkillPickerProvider>
        <SkillPickerContent
          ref={pickerRef}
          umaId={undefined}
          options={optionIds}
          currentSkills={[]}
          onSelect={onSelect}
          columnCount={4}
        />
      </SkillPickerProvider>,
    );

    const searchInput = screen.getByPlaceholderText('Search skill by name');
    searchInput.focus();

    let rows = getSelectableRows();
    expect(rows).toHaveLength(optionIds.length);
    expect(getHighlightedRows()).toHaveLength(0);
    expect(searchInput).toHaveFocus();
    expect(screen.getByText(/↑\/↓ move between rows/)).toBeInTheDocument();

    act(() => {
      pressHotkey(searchInput, 'ArrowRight');
    });

    expect(getHighlightedRows()).toHaveLength(0);

    act(() => {
      pressHotkey(searchInput, 'ArrowDown');
    });

    rows = getSelectableRows();
    expect(searchInput).toHaveFocus();
    expect(rows[0]).toHaveAttribute('data-highlighted', 'true');

    act(() => {
      pressHotkey(searchInput, 'ArrowRight');
    });

    rows = getSelectableRows();
    expect(rows[1]).toHaveAttribute('data-highlighted', 'true');

    act(() => {
      pressHotkey(searchInput, 'ArrowDown');
    });

    rows = getSelectableRows();
    expect(rows[5]).toHaveAttribute('data-highlighted', 'true');

    const escapeEvent = createEvent.keyDown(searchInput, {
      key: 'Escape',
      code: 'Escape',
      keyCode: keyCodes.Escape,
      which: keyCodes.Escape,
      bubbles: true,
      cancelable: true,
    });

    act(() => {
      fireEvent(searchInput, escapeEvent);
    });

    expect(escapeEvent.defaultPrevented).toBe(true);
    expect(searchInput).toHaveFocus();
    expect(getHighlightedRows()).toHaveLength(0);

    act(() => {
      pressHotkey(searchInput, 'ArrowRight');
    });

    expect(getHighlightedRows()).toHaveLength(0);

    act(() => {
      pressHotkey(searchInput, 'ArrowDown');
    });
    act(() => {
      pressHotkey(searchInput, 'ArrowRight');
    });
    act(() => {
      pressHotkey(searchInput, 'Enter');
    });

    rows = getSelectableRows();
    expect(rows[6]).toHaveAttribute('data-highlighted', 'true');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([optionIds[6]]);
  });
});
