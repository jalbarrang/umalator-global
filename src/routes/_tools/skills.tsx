import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SearchIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { dataRegistry } from '@/modules/data/registry';
import type { SkillEntry } from '@/modules/data/services/SkillService';
import { SkillPickerFilterRow } from '@/modules/skills/components/skill-picker/filter-row';
import { SkillPickerProvider } from '@/modules/skills/components/skill-picker/provider';
import { useFilteredSkills } from '@/modules/skills/components/skill-picker/store';
import { SkillIcon } from '@/modules/skills/components/skill-list/skill-item/SkillIcon';
import { AlternativeDetails } from '@/modules/skills/components/ExpandedSkillDetails';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const SKILL_CARD_HEIGHT = 300;
const SKILL_LIST_OVERSCAN = 4;

function getRarityLabel(rarity: number) {
  if (rarity === 1) return 'White';
  if (rarity === 2) return 'Gold';
  if (rarity === 3) return 'Lesser Unique';
  if (rarity === 4) return 'Unique';
  if (rarity === 5) return 'Unique';
  if (rarity === 6) return 'Evolved';

  return `Rarity ${rarity}`;
}

type SkillFamilyProps = {
  skill: SkillEntry;
};

function SkillFamily(props: SkillFamilyProps) {
  const { skill } = props;

  const familySkills = useMemo(() => {
    return dataRegistry.skills
      .getByGroupId(skill.groupId)
      .filter((familySkill) => familySkill.id !== skill.id)
      .sort((a, b) => b.rarity - a.rarity);
  }, [skill.groupId, skill.id]);

  if (familySkills.length === 0) {
    return <div className="text-xs text-muted-foreground">None</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {familySkills.map((familySkill) => (
        <Badge key={familySkill.id} variant="outline" className="gap-2 rounded-md py-2 pl-1 pr-2">
          <span className="[&_img]:size-5">
            <SkillIcon iconId={familySkill.iconId} />
          </span>

          <span className="min-w-0 truncate">{familySkill.name}</span>
        </Badge>
      ))}
    </div>
  );
}

type SkillBrowserItemProps = {
  skill: SkillEntry;
};

function SkillBrowserItem(props: SkillBrowserItemProps) {
  const { skill } = props;

  return (
    <div className="flex flex-col md:flex-row gap-1 md:gap-4 rounded-lg border bg-card">
      <div className="flex items-center gap-4 px-4 py-2 border-b md:border-none">
        <SkillIcon iconId={skill.iconId} />

        <div className="flex flex-col gap-2">
          <div className="truncate text-sm">{skill.name}</div>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>ID:</span>
            <code>{skill.id}</code>
          </div>

          <div className="flex gap-2">
            {skill.baseCost > 0 && <Badge variant="outline">{skill.baseCost} SP</Badge>}
            <Badge variant="outline">{getRarityLabel(skill.rarity)}</Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4 py-2 border-b md:border-none">
        <section className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">Related skills</div>
          <SkillFamily skill={skill} />
        </section>
      </div>

      <div className={cn('flex flex-col text-xs px-4 md:py-2')}>
        {skill.alternatives.length > 1 ? (
          <Tabs defaultValue={0}>
            <TabsList>
              {skill.alternatives.map((alternative, index) => {
                const alternativeKey = `${alternative.precondition ?? ''}-${alternative.condition}-${alternative.baseDuration}`;

                return (
                  <TabsTrigger key={alternativeKey} value={index}>
                    Alt {index + 1}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {skill.alternatives.map((alternative, index) => {
              const alternativeKey = `${alternative.precondition ?? ''}-${alternative.condition}-${alternative.baseDuration}`;

              return (
                <TabsContent key={alternativeKey} value={index}>
                  <AlternativeDetails alternative={alternative} />
                </TabsContent>
              );
            })}
          </Tabs>
        ) : (
          <AlternativeDetails alternative={skill.alternatives[0]} />
        )}
      </div>
    </div>
  );
}

function SkillsBrowserContent() {
  const [searchText, setSearchText] = useState('');
  const deferredSearchText = useDeferredValue(searchText);

  const allSkills = useMemo(() => dataRegistry.skills.getAll(), []);
  const filteredSkills = useFilteredSkills(deferredSearchText, allSkills);
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: filteredSkills.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => SKILL_CARD_HEIGHT,
    overscan: SKILL_LIST_OVERSCAN,
    getItemKey: (index) => filteredSkills[index]?.id ?? `skill-${index}`
  });

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3 p-3 md:p-4">
      <header className="flex shrink-0 flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold leading-tight">Skills</h1>
          <div className="text-sm text-muted-foreground">
            {filteredSkills.length} of {allSkills.length} skills
          </div>
        </div>

        <InputGroup>
          <InputGroupAddon>
            <SearchIcon className="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            value={searchText}
            placeholder="Search skill by name"
            onChange={(event) => setSearchText(event.target.value)}
          />
        </InputGroup>

        <SkillPickerFilterRow />
      </header>

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto pr-1">
        {filteredSkills.length > 0 ? (
          <div className="relative w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const skill = filteredSkills[virtualRow.index];
              if (!skill) return null;

              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                  data-index={virtualRow.index}
                >
                  <SkillBrowserItem skill={skill} />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border">
            <div className="text-sm text-muted-foreground">
              No skills match the current filters.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SkillsPage() {
  return (
    <SkillPickerProvider>
      <SkillsBrowserContent />
    </SkillPickerProvider>
  );
}
