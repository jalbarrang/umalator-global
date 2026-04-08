import { SearchIcon } from 'lucide-react';
import {
  useCallback,
  useDeferredValue,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
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
  const [focusedSkillIndex, setFocusedSkillIndex] = useState<number>(-1);

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

  const toggleSelected: React.MouseEventHandler<HTMLDivElement> = useCallback(
    (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;

      const eventElement = target.closest('[data-event]') as HTMLElement;
      if (!eventElement) return;

      const eventType = eventElement.dataset.event;
      if (!eventType) return;

      if (eventType !== 'select-skill') return;

      let id = eventElement.dataset.skillid;
      const skill = skills.find((skillItem) => skillItem.id === id);
      if (!skill) return;

      const groupId = `${skill.groupId}`;
      const newSelected = new Set(currentSkills);

      const selectedId = selectedMap.get(groupId);
      if (selectedId && selectedId === id && id !== umaUniqueSkillId) {
        newSelected.delete(selectedId);
        onSelect(Array.from(newSelected));
        return;
      }

      if (selectedId) {
        newSelected.delete(selectedId);
      } else if (shouldAllowDuplicateSkill(skill)) {
        let count = 0;

        for (const newSelectedId of newSelected) {
          if (newSelectedId.split('-')[0] === id) {
            count++;
          }
        }

        id = count > 0 ? `${id}-${count}` : id;
      }

      if (id) {
        newSelected.add(id);
      }

      onSelect(Array.from(newSelected));
    },
    [currentSkills, selectedMap, shouldAllowDuplicateSkill, onSelect, umaUniqueSkillId, skills],
  );

  useHotkeys('f', (event) => {
    event.preventDefault();

    searchRef.current?.focus();
    searchRef.current?.select();
  });

  // Keyboard navigation for filtered skills
  useHotkeys(
    'down',
    (event) => {
      event.preventDefault();
      if (filteredSkills.length === 0) return;

      const currentIndex = focusedSkillIndex;
      const nextIndex = currentIndex + 1;

      const clampedNextIndex = nextIndex >= filteredSkills.length ? 0 : nextIndex;

      setFocusedSkillIndex(clampedNextIndex);
      rowVirtualizer.scrollToIndex(clampedNextIndex);
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    'up',
    (event) => {
      event.preventDefault();
      if (filteredSkills.length === 0) return;

      const currentIndex = focusedSkillIndex;
      const nextIndex = currentIndex - 1;

      const clampedNextIndex = nextIndex < 0 ? filteredSkills.length - 1 : nextIndex;

      setFocusedSkillIndex(clampedNextIndex);
      rowVirtualizer.scrollToIndex(clampedNextIndex);
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    'enter',
    (event) => {
      if (focusedSkillIndex < 0 || focusedSkillIndex >= filteredSkills.length) return;

      event.preventDefault();
      const focusedSkill = filteredSkills[focusedSkillIndex];
      if (!focusedSkill) return;

      const groupId = `${focusedSkill.groupId}`;
      const newSelected = new Set(currentSkills);

      const selectedId = selectedMap.get(groupId);
      if (selectedId === focusedSkill.id && focusedSkill.id !== umaUniqueSkillId) {
        newSelected.delete(selectedId);
        onSelect(Array.from(newSelected));
      } else {
        if (selectedId) {
          newSelected.delete(selectedId);
        } else if (shouldAllowDuplicateSkill(focusedSkill)) {
          let count = 0;
          for (const newSelectedId of newSelected) {
            if (newSelectedId.split('-')[0] === focusedSkill.id) {
              count++;
            }
          }
          const skillIdWithSuffix = count > 0 ? `${focusedSkill.id}-${count}` : focusedSkill.id;
          newSelected.add(skillIdWithSuffix);
        } else {
          newSelected.add(focusedSkill.id);
        }

        onSelect(Array.from(newSelected));
      }

      // Reset focus index and return focus to search input
      setFocusedSkillIndex(-1);
      searchRef.current?.focus();
    },
    { enableOnFormTags: true },
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

  const parentRef = useRef(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredSkills.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 40,
    getItemKey: (index) => {
      return filteredSkills[index]?.id ?? `skill-${index}`;
    },
  });

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
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText className="border p-1 rounded-md text-foreground">
              <kbd>f</kbd>
            </InputGroupText>
          </InputGroupAddon>
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
                focused={focusedSkillIndex === virtualItem.index}
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
  focused: boolean;
  toggleSelected: React.MouseEventHandler<HTMLDivElement>;
};

const SkillPickerItem = (props: SkillPickerItemProps) => {
  const { skill, virtualItem, selected, focused, toggleSelected } = props;

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
