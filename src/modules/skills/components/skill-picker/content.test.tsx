// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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

const getOptionIds = () =>
  getSkills()
    .filter((skill) => skill.name.length > 0 && skill.iconId.length > 0)
    .slice(0, 3)
    .map((skill) => skill.id);

const getSelectableRows = () =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-event="select-skill"]'));

const keyCodes: Record<string, number> = {
  ArrowDown: 40,
  ArrowUp: 38,
  Enter: 13,
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
  it('keeps search focused while arrows move the highlighted row and Enter selects it', () => {
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
        />
      </SkillPickerProvider>,
    );

    const searchInput = screen.getByPlaceholderText('Search skill by name');
    searchInput.focus();

    let rows = getSelectableRows();
    expect(rows).toHaveLength(optionIds.length);
    expect(rows[0]).toHaveAttribute('data-highlighted', 'true');
    expect(searchInput).toHaveFocus();

    act(() => {
      pressHotkey(searchInput, 'ArrowDown');
    });

    rows = getSelectableRows();
    expect(searchInput).toHaveFocus();
    expect(rows[0]).not.toHaveAttribute('data-highlighted', 'true');
    expect(rows[1]).toHaveAttribute('data-highlighted', 'true');

    act(() => {
      pressHotkey(searchInput, 'ArrowUp');
    });

    rows = getSelectableRows();
    expect(rows[0]).toHaveAttribute('data-highlighted', 'true');

    act(() => {
      pressHotkey(searchInput, 'ArrowDown');
    });
    act(() => {
      pressHotkey(searchInput, 'Enter');
    });

    expect(searchInput).toHaveFocus();
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith([optionIds[1]]);
  });
});
