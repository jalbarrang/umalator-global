import { SearchIcon } from 'lucide-react';
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';
import { getManySkills, SkillEntry } from '@/modules/data/skills';
import { getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import {
  SkillItem,
  SkillItemActions,
  SkillItemBody,
  SkillItemDetailsActions,
  SkillItemIdentity,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
} from '../skill-list/skill-item';
import { SkillPickerFilterRow } from './filter-row';
import { useFilteredSkills } from './store';

const SKILL_ROW_HEIGHT = 52;
const MOBILE_SKILL_OVERSCAN = 20;
const DESKTOP_SKILL_OVERSCAN = 8;

export type SkillPickerContentProps = {
  ref: React.RefObject<{ focus: () => void } | null>;
  umaId: string | undefined;
  options: Array<string>;
  currentSkills: Array<string>;
  onSelect: (skills: Array<string>) => void;
  className?: string;
  columnCount: number;
  allowDuplicateSkills?: boolean;
};

export function SkillPickerContent(props: SkillPickerContentProps) {
  const {
    ref,
    umaId,
    options,
    currentSkills,
    onSelect,
    className,
    columnCount,
    allowDuplicateSkills = false,
  } = props;

  const resolvedColumnCount = Math.max(1, columnCount);
  const isDesktopLayout = resolvedColumnCount > 1;

  const umaUniqueSkillId = useMemo(
    () => (umaId ? getUniqueSkillForByUmaId(umaId) : undefined),
    [umaId],
  );

  const searchRef = useRef<HTMLInputElement>(null);
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);

  const skills = useMemo(() => {
    return getManySkills(options);
  }, [options]);

  const filteredSkills = useFilteredSkills(deferredSearchText, skills);

  // Create a lookup map from skill ID to Skill object
  const skillsById = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills]);

  const shouldAllowDuplicateSkill = useCallback(
    (skill: { iconId: string }) => {
      return allowDuplicateSkills || skill.iconId.startsWith('3');
    },
    [allowDuplicateSkills],
  );

  // Build selected map using the pre-built lookup
  const selectedMap = useMemo(() => {
    const selected: Array<[string, string]> = [];

    for (const id of currentSkills) {
      // Use the pre-built map for O(1) lookup
      const skill = skillsById.get(id.split('-')[0]); // Handle debuff suffixes like "123456-1"
      if (!skill) continue;

      // Skip debuffs - they can be selected multiple times
      if (shouldAllowDuplicateSkill(skill)) continue;

      selected.push([`${skill.groupId}`, id]);
    }

    return new Map(selected);
  }, [currentSkills, skillsById, shouldAllowDuplicateSkill]);

  const toggleSkillSelection = useCallback(
    (skill: SkillEntry) => {
      const groupId = `${skill.groupId}`;
      const newSelected = new Set(currentSkills);

      const selectedId = selectedMap.get(groupId);
      if (selectedId === skill.id && skill.id !== umaUniqueSkillId) {
        newSelected.delete(selectedId);
        onSelect(Array.from(newSelected));
        return;
      }

      if (selectedId) {
        newSelected.delete(selectedId);
      } else if (shouldAllowDuplicateSkill(skill)) {
        let count = 0;

        for (const newSelectedId of newSelected) {
          if (newSelectedId.split('-')[0] === skill.id) {
            count++;
          }
        }

        const skillIdWithSuffix = count > 0 ? `${skill.id}-${count}` : skill.id;
        newSelected.add(skillIdWithSuffix);
        onSelect(Array.from(newSelected));
        return;
      }

      newSelected.add(skill.id);
      onSelect(Array.from(newSelected));
    },
    [currentSkills, onSelect, selectedMap, shouldAllowDuplicateSkill, umaUniqueSkillId],
  );

  const toggleSelected: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;

      const eventElement = target.closest('[data-event]') as HTMLElement;
      if (!eventElement) return;

      const eventType = eventElement.dataset.event;
      if (eventType !== 'select-skill') return;

      const skillId = eventElement.dataset.skillid;
      if (!skillId) return;

      const skill = skillsById.get(skillId);
      if (!skill) return;

      toggleSkillSelection(skill);
    },
    [skillsById, toggleSkillSelection],
  );

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        searchRef.current?.focus();
        searchRef.current?.select();
      },
    }),
    [searchRef],
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualRowCount = Math.ceil(filteredSkills.length / resolvedColumnCount);
  const rowOverscan = isDesktopLayout ? DESKTOP_SKILL_OVERSCAN : MOBILE_SKILL_OVERSCAN;
  const rowVirtualizer = useVirtualizer({
    count: virtualRowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SKILL_ROW_HEIGHT,
    overscan: rowOverscan,
    getItemKey: (index) => {
      const rowStart = index * resolvedColumnCount;
      return filteredSkills[rowStart]?.id ?? `skill-row-${index}`;
    },
  });
  const rowVirtualizerRef = useRef(rowVirtualizer);

  const filteredSkillCount = filteredSkills.length;
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [isBrowsing, setIsBrowsing] = useState(false);

  useEffect(() => {
    rowVirtualizerRef.current = rowVirtualizer;
  }, [rowVirtualizer]);

  const scrollFocusedIntoView = useCallback(
    (index: number) => {
      requestAnimationFrame(() => {
        rowVirtualizerRef.current.scrollToIndex(Math.floor(index / resolvedColumnCount), {
          align: 'auto',
        });
      });
    },
    [resolvedColumnCount],
  );

  useEffect(() => {
    if (filteredSkillCount === 0) {
      setFocusedIndex(0);
      setIsBrowsing(false);
      return;
    }

    setFocusedIndex(0);
    setIsBrowsing(false);
    scrollFocusedIntoView(0);
  }, [filteredSkillCount, filteredSkills, scrollFocusedIntoView]);

  const getLastIndexForRow = useCallback(
    (rowIndex: number) => {
      return Math.min(
        filteredSkillCount - 1,
        rowIndex * resolvedColumnCount + resolvedColumnCount - 1,
      );
    },
    [resolvedColumnCount, filteredSkillCount],
  );

  const moveFocusedHorizontally = useCallback(
    (delta: number) => {
      if (filteredSkillCount === 0) {
        return;
      }

      setFocusedIndex((prev) => {
        const rowIndex = Math.floor(prev / resolvedColumnCount);
        const rowStart = rowIndex * resolvedColumnCount;
        const rowEnd = getLastIndexForRow(rowIndex);
        const next = Math.max(rowStart, Math.min(rowEnd, prev + delta));
        scrollFocusedIntoView(next);
        return next;
      });
    },
    [resolvedColumnCount, filteredSkillCount, getLastIndexForRow, scrollFocusedIntoView],
  );

  const moveFocusedVertically = useCallback(
    (rowDelta: number) => {
      if (filteredSkillCount === 0) {
        return;
      }

      setFocusedIndex((prev) => {
        const currentRowIndex = Math.floor(prev / resolvedColumnCount);
        const currentColumnIndex = prev % resolvedColumnCount;
        const nextRowIndex = Math.max(0, Math.min(virtualRowCount - 1, currentRowIndex + rowDelta));
        const nextRowStart = nextRowIndex * resolvedColumnCount;
        const nextRowEnd = getLastIndexForRow(nextRowIndex);
        const next = Math.min(nextRowEnd, nextRowStart + currentColumnIndex);
        scrollFocusedIntoView(next);
        return next;
      });
    },
    [
      resolvedColumnCount,
      filteredSkillCount,
      getLastIndexForRow,
      scrollFocusedIntoView,
      virtualRowCount,
    ],
  );

  const selectFocusedSkill = useCallback(() => {
    if (filteredSkillCount === 0 || !isBrowsing) {
      return;
    }

    const skill = filteredSkills[focusedIndex];
    if (!skill) {
      return;
    }

    toggleSkillSelection(skill);
  }, [filteredSkillCount, filteredSkills, focusedIndex, isBrowsing, toggleSkillSelection]);

  const hasRows = filteredSkillCount > 0;

  const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.key === 'Escape' && isBrowsing) {
        event.preventDefault();
        event.stopPropagation();
        setIsBrowsing(false);
        searchRef.current?.focus();
        return;
      }

      if (!hasRows) {
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();

        if (!isBrowsing) {
          setIsBrowsing(true);
          scrollFocusedIntoView(focusedIndex);
          return;
        }

        moveFocusedVertically(event.key === 'ArrowUp' ? -1 : 1);
        return;
      }

      if (
        isDesktopLayout &&
        isBrowsing &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        event.stopPropagation();
        moveFocusedHorizontally(event.key === 'ArrowLeft' ? -1 : 1);
        return;
      }

      if (event.key === 'Enter' && isBrowsing) {
        event.preventDefault();
        event.stopPropagation();
        selectFocusedSkill();
        return;
      }

      if (
        isBrowsing &&
        (event.key === 'Backspace' ||
          event.key === 'Delete' ||
          event.key === 'Home' ||
          event.key === 'End' ||
          (!event.altKey && !event.ctrlKey && !event.metaKey && event.key.length === 1))
      ) {
        setIsBrowsing(false);
      }
    },
    [
      focusedIndex,
      hasRows,
      isBrowsing,
      isDesktopLayout,
      moveFocusedHorizontally,
      moveFocusedVertically,
      scrollFocusedIntoView,
      selectFocusedSkill,
    ],
  );

  const handleHighlightSkill = useCallback((skillIndex: number) => {
    setFocusedIndex(skillIndex);
  }, []);

  return (
    <div className={cn('flex flex-col min-h-0 max-h-full gap-2', className)}>
      <div data-filter-group="search">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon className="w-4 h-4" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchRef}
            type="text"
            value={searchText}
            placeholder="Search skill by name"
            onChange={(e) => {
              setIsBrowsing(false);
              setSearchText(e.target.value);
            }}
            onPointerDown={() => {
              setIsBrowsing(false);
            }}
            onKeyDown={handleSearchKeyDown}
          />
        </InputGroup>
      </div>

      <SkillPickerFilterRow />

      <div ref={parentRef} className="h-[500px] overflow-y-auto p-2">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }} className="relative w-full">
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowStart = virtualRow.index * resolvedColumnCount;
            const rowSkills = filteredSkills.slice(rowStart, rowStart + resolvedColumnCount);
            if (rowSkills.length === 0) return null;

            return (
              <div
                key={`skill-row-${rowStart}`}
                className="absolute top-0 left-0 w-full pb-1"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${resolvedColumnCount}, minmax(0, 1fr))` }}
                >
                  {rowSkills.map((skill, columnIndex) => {
                    const skillIndex = rowStart + columnIndex;

                    return (
                      <div key={skill.id} className="min-w-0">
                        <SkillPickerItem
                          skill={skill}
                          skillIndex={skillIndex}
                          selected={selectedMap.get(`${skill.groupId}`) === skill.id}
                          focused={skillIndex === focusedIndex && isBrowsing}
                          onHighlightSkill={handleHighlightSkill}
                          toggleSelected={toggleSelected}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isDesktopLayout ? (
        <div className="px-2 pb-1 text-xs text-muted-foreground">
          ↑/↓ move between rows, ←/→ move between columns, Enter selects, Esc returns to search.
        </div>
      ) : null}
    </div>
  );
}

type SkillPickerItemProps = {
  skill: SkillEntry;
  skillIndex: number;
  selected: boolean;
  focused?: boolean;
  onHighlightSkill: (skillIndex: number) => void;
  toggleSelected: React.MouseEventHandler<HTMLDivElement>;
};

const SkillPickerItem = memo((props: SkillPickerItemProps) => {
  const { skill, skillIndex, selected, focused = false, onHighlightSkill, toggleSelected } = props;

  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const handleHighlightRow = useCallback(() => {
    onHighlightSkill(skillIndex);
  }, [onHighlightSkill, skillIndex]);

  return (
    <div onPointerEnter={handleHighlightRow} onClick={toggleSelected}>
      <SkillItem skillId={skill.id}>
        <SkillItemRoot
          interactive
          selected={selected}
          isHovered={hovered}
          isFocused={focused}
          className="h-full"
          data-highlighted={focused ? 'true' : undefined}
          onPointerEnter={handleMouseEnter}
          onPointerLeave={handleMouseLeave}
        >
          <SkillItemRail />
          <SkillItemBody className="p-1 px-2">
            <SkillItemMain>
              <SkillItemIdentity labelProps={{ className: 'text-xs' }} />
              <SkillItemActions>
                <SkillItemDetailsActions />
              </SkillItemActions>
            </SkillItemMain>
          </SkillItemBody>
        </SkillItemRoot>
      </SkillItem>
    </div>
  );
});
