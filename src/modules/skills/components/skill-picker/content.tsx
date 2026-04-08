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
import { VirtualizedSkillGrid } from '../VirtualizedSkillGrid';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from '@/components/ui/input-group';
import { getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { getManySkills } from '@/modules/data/skills';
import { useFilteredSkills } from './store';
import { useIsMobile } from '@/hooks/use-mobile';
import { SkillPickerFilterRow } from './filter-row';

export type SkillPickerContentProps = {
  ref: React.RefObject<{ focus: () => void } | null>;
  umaId: string | undefined;
  options: Array<string>;
  currentSkills: Array<string>;
  onSelect: (skills: Array<string>) => void;
  isMobile?: boolean;
  allowDuplicateSkills?: boolean;
};

export function SkillPickerContent(props: SkillPickerContentProps) {
  const { ref, umaId, options, currentSkills, onSelect, allowDuplicateSkills = false } = props;

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

      setFocusedSkillIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex >= filteredSkills.length ? 0 : nextIndex;
      });
    },
    { enableOnFormTags: true },
  );

  useHotkeys(
    'up',
    (event) => {
      event.preventDefault();
      if (filteredSkills.length === 0) return;

      setFocusedSkillIndex((prev) => {
        const nextIndex = prev - 1;
        return nextIndex < 0 ? filteredSkills.length - 1 : nextIndex;
      });
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

  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
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

      {!isMobile && <SkillPickerFilterRow />}

      <div className="flex flex-col min-h-0 overflow-y-auto">
        <VirtualizedSkillGrid
          items={filteredSkills}
          selectedMap={selectedMap}
          onClick={toggleSelected}
          className="p-1"
          focusedSkillId={
            focusedSkillIndex >= 0 && focusedSkillIndex < filteredSkills.length
              ? filteredSkills[focusedSkillIndex].id
              : null
          }
        />
      </div>
    </div>
  );
}
