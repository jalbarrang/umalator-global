import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { skillsService } from '@/modules/data/registry';
import type { SkillEntry } from '@/modules/data/services/SkillService';
import { SkillPickerFilterRow } from '@/modules/skills/components/skill-picker/filter-row';
import { SkillPickerProvider } from '@/modules/skills/components/skill-picker/provider';
import { useFilteredSkills } from '@/modules/skills/components/skill-picker/store';
import { SkillPickerVirtualGrid } from '@/modules/skills/components/skill-picker/virtual-grid';
import { SkillIcon } from '@/modules/skills/components/skill-list/skill-item/SkillIcon';
import { getBaseSkillsToTest } from '@/modules/skills/utils';
import {
  initializeSkillSelection,
  toggleSkillSelected,
  useSkillSelectionStore
} from '../stores/skill-selection.store';

type SkillRowProps = {
  skill: SkillEntry;
  selected: boolean;
  showUpcomingBadge: boolean;
  released: boolean;
  onToggle: (skillId: string) => void;
};

const SkillRow = memo((props: SkillRowProps) => {
  const { skill, selected, showUpcomingBadge, released, onToggle } = props;

  return (
    <button
      type="button"
      className="flex h-full w-full items-center gap-2 rounded px-2 py-1 text-left transition-colors cursor-pointer hover:bg-muted"
      onClick={() => onToggle(skill.id)}
    >
      <Checkbox checked={selected} tabIndex={-1} className="pointer-events-none" />
      <SkillIcon iconId={skill.iconId} />
      <span className="min-w-0 flex-1 truncate text-xs">{skill.name}</span>
      {showUpcomingBadge && !released && (
        <Badge variant="outline" className="shrink-0 text-[10px] opacity-60">
          Upcoming
        </Badge>
      )}
    </button>
  );
});

type SkillSelectorPanelProps = {
  skills: Array<SkillEntry>;
  releasedIds: Set<string>;
  selectedSkillIds: Set<string>;
  onToggle: (skillId: string) => void;
  listEnabled: boolean;
  columnCount: number;
  showUpcomingBadge?: boolean;
};

function SkillSelectorPanel(props: SkillSelectorPanelProps) {
  const {
    skills,
    releasedIds,
    selectedSkillIds,
    onToggle,
    listEnabled,
    columnCount,
    showUpcomingBadge
  } = props;

  return (
    <SkillPickerProvider>
      <SkillSelectorPanelContent
        skills={skills}
        releasedIds={releasedIds}
        selectedSkillIds={selectedSkillIds}
        onToggle={onToggle}
        listEnabled={listEnabled}
        columnCount={columnCount}
        showUpcomingBadge={showUpcomingBadge}
      />
    </SkillPickerProvider>
  );
}

function SkillSelectorPanelContent(props: SkillSelectorPanelProps) {
  const {
    skills,
    releasedIds,
    selectedSkillIds,
    onToggle,
    listEnabled,
    columnCount,
    showUpcomingBadge = true
  } = props;

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  const filteredSkills = useFilteredSkills(deferredSearch, skills, { showUpcoming: true });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          type="text"
          value={search}
          placeholder="Search skill by name"
          onChange={(e) => setSearch(e.target.value)}
        />
      </InputGroup>

      <SkillPickerFilterRow showUpcomingToggle={false} />

      <SkillPickerVirtualGrid
        filteredSkills={filteredSkills}
        columnCount={columnCount}
        enabled={listEnabled}
        renderItem={({ skill }) => (
          <SkillRow
            skill={skill}
            selected={selectedSkillIds.has(skill.id)}
            released={releasedIds.has(skill.id)}
            showUpcomingBadge={showUpcomingBadge}
            onToggle={onToggle}
          />
        )}
      />
    </div>
  );
}

export function SkillSelectorDialog() {
  const selectedSkillIds = useSkillSelectionStore((state) => state.selectedSkillIds);
  const isMobile = useIsMobile();
  const columnCount = isMobile ? 1 : 4;

  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'released' | 'upcoming'>('released');

  useEffect(() => {
    initializeSkillSelection();
  }, []);

  const allSkills = useMemo(() => {
    const baseSkillIds = getBaseSkillsToTest();
    const simulatable = skillsService.filterSimulatable(baseSkillIds);

    return simulatable
      .map((id) => skillsService.getById(id))
      .filter((s): s is SkillEntry => s !== undefined)
      .sort((a, b) => {
        if (!a.releaseDate || !b.releaseDate) return 0;

        const dateCmp = a.releaseDate.localeCompare(b.releaseDate);

        if (dateCmp !== 0) return dateCmp;

        return a.name.localeCompare(b.name);
      });
  }, []);

  const releasedIds = useMemo(
    () => new Set(allSkills.filter((s) => skillsService.isReleased(s.id)).map((s) => s.id)),
    [allSkills]
  );

  const releasedSkills = useMemo(
    () => allSkills.filter((s) => releasedIds.has(s.id)),
    [allSkills, releasedIds]
  );

  const upcomingSkills = useMemo(
    () => allSkills.filter((s) => !releasedIds.has(s.id)),
    [allSkills, releasedIds]
  );

  const selectedCount = selectedSkillIds.size;
  const totalCount = allSkills.length;

  const handleToggle = useCallback((skillId: string) => {
    toggleSkillSelected(skillId);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            Skills to simulate
            <Badge variant="default">{selectedCount}</Badge>
          </Button>
        }
      />

      <DialogContent className="flex h-dvh max-w-full min-h-0 flex-col md:h-[90dvh] md:max-w-[1200px]!">
        <DialogHeader>
          <DialogTitle>
            Skills to simulate
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {selectedCount} / {totalCount}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'released' | 'upcoming')}
            className="flex min-h-0 flex-1 flex-col"
          >
            <TabsList className="h-10! w-full">
              <TabsTrigger value="released" className="flex-1">
                Released ({releasedSkills.length})
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="flex-1">
                Upcoming ({upcomingSkills.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="released"
              className="mt-0 flex min-h-0 flex-1 flex-col data-hidden:hidden"
            >
              <SkillSelectorPanel
                key="released"
                skills={releasedSkills}
                releasedIds={releasedIds}
                selectedSkillIds={selectedSkillIds}
                onToggle={handleToggle}
                listEnabled={open && activeTab === 'released'}
                columnCount={columnCount}
                showUpcomingBadge
              />
            </TabsContent>

            <TabsContent
              value="upcoming"
              className="mt-0 flex min-h-0 flex-1 flex-col data-hidden:hidden"
            >
              <SkillSelectorPanel
                key="upcoming"
                skills={upcomingSkills}
                releasedIds={releasedIds}
                selectedSkillIds={selectedSkillIds}
                onToggle={handleToggle}
                listEnabled={open && activeTab === 'upcoming'}
                columnCount={columnCount}
                showUpcomingBadge={false}
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
