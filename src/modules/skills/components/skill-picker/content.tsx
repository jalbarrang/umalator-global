import { SearchIcon } from 'lucide-react';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { getManySkills, SkillEntry } from '@/modules/data/skills';
import { useFilteredSkills } from './store';
import { cn } from '@/lib/utils';
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
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual';

const SKILL_ROW_HEIGHT = 50;
const SKILL_OVERSCAN = 40;

export type SkillPickerContentProps = {
  ref: React.RefObject<{ focus: () => void } | null>;
  umaId: string | undefined;
  options: Array<string>;
  currentSkills: Array<string>;
  onSelect: (skills: Array<string>) => void;
  className?: string;
  isMobile?: boolean;
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
    allowDuplicateSkills = false,
  } = props;

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

  const rowVirtualizer = useVirtualizer({
    count: filteredSkills.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SKILL_ROW_HEIGHT,
    overscan: SKILL_OVERSCAN,
    getItemKey: (index) => {
      return filteredSkills[index]?.id ?? `skill-${index}`;
    },
  });
  const rowVirtualizerRef = useRef(rowVirtualizer);

  const rowCount = filteredSkills.length;
  const filteredSkillIds = useMemo(
    () => filteredSkills.map((skill) => skill.id).join('|'),
    [filteredSkills],
  );
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    rowVirtualizerRef.current = rowVirtualizer;
  }, [rowVirtualizer]);

  const scrollFocusedIntoView = useCallback(
    (index: number) => {
      requestAnimationFrame(() => {
        rowVirtualizerRef.current.scrollToIndex(index, { align: 'auto' });
      });
    },
    [],
  );

  useEffect(() => {
    if (rowCount === 0) {
      setFocusedIndex(0);
      return;
    }

    setFocusedIndex(0);
    scrollFocusedIntoView(0);
  }, [filteredSkillIds, rowCount, scrollFocusedIntoView]);

  const moveFocusedIndex = useCallback(
    (delta: number) => {
      if (rowCount === 0) {
        return;
      }

      setFocusedIndex((prev) => {
        const next = Math.max(0, Math.min(rowCount - 1, prev + delta));
        scrollFocusedIntoView(next);
        return next;
      });
    },
    [rowCount, scrollFocusedIntoView],
  );

  const selectFocusedSkill = useCallback(() => {
    if (rowCount === 0) {
      return;
    }

    const skill = filteredSkills[focusedIndex];
    if (!skill) {
      return;
    }

    toggleSkillSelection(skill);
  }, [filteredSkills, focusedIndex, rowCount, toggleSkillSelection]);

  const hasRows = rowCount > 0;

  const handleSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (!hasRows) {
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveFocusedIndex(-1);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveFocusedIndex(1);
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        selectFocusedSkill();
      }
    },
    [hasRows, moveFocusedIndex, selectFocusedSkill],
  );

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
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={handleSearchKeyDown}
          />
        </InputGroup>
      </div>

      {/* {!isMobile && <SkillPickerFilterRow />} */}

      <div ref={parentRef} className="h-[400px] overflow-y-auto p-2">
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }} className="relative w-full">
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            const skill = filteredSkills[virtualItem.index];
            if (!skill) return null;

            return (
              <SkillPickerItem
                key={skill.id}
                skill={skill}
                virtualItem={virtualItem}
                selected={selectedMap.get(`${skill.groupId}`) === skill.id}
                focused={virtualItem.index === focusedIndex}
                onHighlightRow={() => {
                  setFocusedIndex(virtualItem.index);
                }}
                toggleSelected={toggleSelected}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

type SkillPickerItemProps = {
  skill: SkillEntry;
  virtualItem: VirtualItem;
  selected: boolean;
  focused?: boolean;
  onHighlightRow: () => void;
  toggleSelected: React.MouseEventHandler<HTMLDivElement>;
};

const SkillPickerItem = (props: SkillPickerItemProps) => {
  const { skill, virtualItem, selected, focused = false, onHighlightRow, toggleSelected } = props;

  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  return (
    <div
      key={skill.id}
      onPointerEnter={onHighlightRow}
      onClick={toggleSelected}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualItem.size}px`,
        transform: `translateY(${virtualItem.start}px)`,
      }}
    >
      <SkillItem skillId={skill.id}>
        <SkillItemRoot
          interactive
          selected={selected}
          isHovered={hovered}
          isFocused={focused}
          data-highlighted={focused ? 'true' : undefined}
          onPointerEnter={handleMouseEnter}
          onPointerLeave={handleMouseLeave}
        >
          <SkillItemRail />
          <SkillItemBody className="p-1 px-2">
            <SkillItemMain>
              <SkillItemIdentity />
              <SkillItemActions>
                <SkillItemDetailsActions />
              </SkillItemActions>
            </SkillItemMain>
          </SkillItemBody>
        </SkillItemRoot>
      </SkillItem>
    </div>
  );
};
