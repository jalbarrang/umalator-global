import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState
} from 'react';
import { SearchIcon } from 'lucide-react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { skillsService } from '@/modules/data/registry';
import type { SkillEntry } from '@/modules/data/services/SkillService';
import { SkillIcon } from '@/modules/skills/components/skill-list/skill-item/SkillIcon';
import { getBaseSkillsToTest } from '@/modules/skills/utils';
import {
  clearSelection,
  initializeSkillSelection,
  selectAll,
  selectReleasedOnly,
  selectUpcomingOnly,
  toggleSkillSelected,
  useSkillSelectionStore
} from '../stores/skill-selection.store';

const ROW_HEIGHT = 40;
const OVERSCAN = 12;

type PresetButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
};

function PresetButton(props: PresetButtonProps) {
  const { label, active, onClick } = props;

  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size="xs"
      onClick={onClick}
    >
      {label}
    </Button>
  );
}

type SkillRowProps = {
  skill: SkillEntry;
  selected: boolean;
  released: boolean;
  onToggle: (skillId: string) => void;
};

const SkillRow = memo((props: SkillRowProps) => {
  const { skill, selected, released, onToggle } = props;

  return (
    <button
      type="button"
      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left hover:bg-muted transition-colors cursor-pointer"
      onClick={() => onToggle(skill.id)}
    >
      <Checkbox checked={selected} tabIndex={-1} className="pointer-events-none" />
      <SkillIcon iconId={skill.iconId} />
      <span className="min-w-0 truncate text-xs flex-1">{skill.name}</span>
      {!released && (
        <Badge variant="outline" className="text-[10px] shrink-0 opacity-60">
          Upcoming
        </Badge>
      )}
    </button>
  );
});

export function SkillSelectorDialog() {
  const [open, setOpen] = useState(false);
  const selectedSkillIds = useSkillSelectionStore((state) => state.selectedSkillIds);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [scrollElement, setScrollElement] = useState<HTMLDivElement | null>(null);

  // Initialize on first mount
  useEffect(() => {
    initializeSkillSelection();
  }, []);

  // All simulatable base skills (stable across renders)
  const allSkills = useMemo(() => {
    const baseSkillIds = getBaseSkillsToTest();
    const simulatable = skillsService.filterSimulatable(baseSkillIds);

    return simulatable
      .map((id) => skillsService.getById(id))
      .filter((s): s is SkillEntry => s !== undefined)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const releasedIds = useMemo(
    () => new Set(allSkills.filter((s) => skillsService.isReleased(s.id)).map((s) => s.id)),
    [allSkills]
  );

  // Filter by search
  const filteredSkills = useMemo(() => {
    if (!deferredSearch) return allSkills;
    const q = deferredSearch.toLowerCase();

    return allSkills.filter(
      (s) => s.name.toLowerCase().includes(q) || s.id.includes(q)
    );
  }, [allSkills, deferredSearch]);

  // Preset detection
  const selectedCount = selectedSkillIds.size;
  const totalCount = allSkills.length;
  const releasedCount = releasedIds.size;
  const upcomingCount = totalCount - releasedCount;

  const isReleasedOnly = selectedCount === releasedCount &&
    allSkills.every((s) => selectedSkillIds.has(s.id) === releasedIds.has(s.id));
  const isAll = selectedCount === totalCount;
  const isUpcomingOnly = selectedCount === upcomingCount &&
    allSkills.every((s) => selectedSkillIds.has(s.id) === !releasedIds.has(s.id));

  const handleToggle = useCallback((skillId: string) => {
    toggleSkillSelected(skillId);
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: filteredSkills.length,
    enabled: open && scrollElement !== null,
    getScrollElement: () => scrollElement,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            Skills to simulate
            <Badge variant="secondary" className="ml-1">
              {selectedCount}
            </Badge>
          </Button>
        }
      />

      <DialogContent className="flex flex-col h-dvh md:h-[80dvh] min-h-0 max-w-full md:max-w-[520px]!">
        <DialogHeader>
          <DialogTitle>
            Skills to simulate
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {selectedCount} / {totalCount}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Preset buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <PresetButton label="Released" active={isReleasedOnly} onClick={selectReleasedOnly} />
          <PresetButton label="All" active={isAll} onClick={selectAll} />
          <PresetButton label="Upcoming" active={isUpcomingOnly} onClick={selectUpcomingOnly} />
          <PresetButton label="Clear" active={selectedCount === 0} onClick={clearSelection} />
        </div>

        {/* Search */}
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>

        {/* Skill list */}
        <div ref={setScrollElement} className="flex-1 min-h-0 overflow-y-auto">
          <div style={{ height: rowVirtualizer.getTotalSize() }} className="relative w-full">
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const skill = filteredSkills[virtualRow.index];
              if (!skill) return null;

              return (
                <div
                  key={skill.id}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <SkillRow
                    skill={skill}
                    selected={selectedSkillIds.has(skill.id)}
                    released={releasedIds.has(skill.id)}
                    onToggle={handleToggle}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
