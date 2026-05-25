import { memo, useCallback, useDeferredValue, useEffect, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import type { SkillEntry } from '@/modules/data/services/SkillService';
import { SkillPickerFilterRow } from '@/modules/skills/components/skill-picker/filter-row';
import { SkillPickerProvider } from '@/modules/skills/components/skill-picker/provider';
import {
  hasActiveSkillPickerFilters,
  type SkillPickerFilterGroup,
  useFilteredSkills,
  useSkillPickerStore
} from '@/modules/skills/components/skill-picker/store';
import { SkillPickerVirtualGrid } from '@/modules/skills/components/skill-picker/virtual-grid';
import { SkillIcon } from '@/modules/skills/components/skill-list/skill-item/SkillIcon';
import { useActivatableSkillsForRace } from '@/modules/simulation/hooks/skill-bassin/useActivatableSkillsForRace';
import {
  deselectAllSkills,
  resetSkillSelectionForRace,
  selectAllSkills,
  toggleSkillSelected,
  useSkillSelectionStore
} from '../stores/skill-selection.store';

const SKILL_BASSIN_HIDDEN_FILTER_GROUPS = new Set<SkillPickerFilterGroup>([
  'strategy',
  'distance',
  'surface'
]);

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

type SkillSelectorPanelContentProps = {
  skills: Array<SkillEntry>;
  releasedIds: Set<string>;
  selectedSkillIds: Set<string>;
  onToggle: (skillId: string) => void;
  listEnabled: boolean;
  columnCount: number;
  showUpcomingBadge?: boolean;
};

type SkillSelectorPanelProps = SkillSelectorPanelContentProps & {
  panelKey: string;
};

function SkillSelectorPanel(props: SkillSelectorPanelProps) {
  const { panelKey, ...contentProps } = props;

  return (
    <SkillPickerProvider key={panelKey}>
      <SkillSelectorPanelContent {...contentProps} />
    </SkillPickerProvider>
  );
}

function SkillSelectorPanelContent(props: SkillSelectorPanelContentProps) {
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

  const filters = useSkillPickerStore((state) => state.filters);
  const filteredSkills = useFilteredSkills(deferredSearch, skills, { showUpcoming: true });

  const filteredCount = filteredSkills.length;
  const hasNarrowedList =
    search.trim().length > 0 ||
    hasActiveSkillPickerFilters(filters, SKILL_BASSIN_HIDDEN_FILTER_GROUPS);
  const countSuffix = hasNarrowedList ? ` (${filteredCount})` : '';

  const handleSelectAll = useCallback(() => {
    selectAllSkills(filteredSkills.map((s) => s.id));
  }, [filteredSkills]);

  const handleDeselectAll = useCallback(() => {
    deselectAllSkills(filteredSkills.map((s) => s.id));
  }, [filteredSkills]);

  const handleClearSearch = useCallback(() => {
    setSearch('');
  }, []);

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

      <SkillPickerFilterRow
        showUpcomingToggle={false}
        hiddenFilterGroups={SKILL_BASSIN_HIDDEN_FILTER_GROUPS}
        onAfterClear={handleClearSearch}
        hasAdditionalFilters={search.trim().length > 0}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filteredCount === 0}
          onClick={handleSelectAll}
        >
          Select All{countSuffix}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={filteredCount === 0}
          onClick={handleDeselectAll}
        >
          Deselect all{countSuffix}
        </Button>
      </div>

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

  const {
    raceSettingsKey,
    allSkills,
    releasedIds,
    releasedSkills,
    upcomingSkills,
    releasedActivatableIds
  } = useActivatableSkillsForRace();

  useEffect(() => {
    resetSkillSelectionForRace(releasedActivatableIds);
  }, [raceSettingsKey, releasedActivatableIds]);

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
          <DialogDescription>
            Listed skills match your current race settings above. Changing those settings refreshes
            the list and re-selects all matching released skills.
          </DialogDescription>
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
                panelKey={`released-${raceSettingsKey}`}
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
                panelKey={`upcoming-${raceSettingsKey}`}
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
