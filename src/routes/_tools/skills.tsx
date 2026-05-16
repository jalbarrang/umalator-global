import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SearchIcon, UsersIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover';
import i18n from '@/i18n';
import { describeRecoveryEffect } from '@/lib/sunday-tools/skills/recovery-effect-utils';
import { dataRegistry } from '@/modules/data/registry';
import type { SkillEntry } from '@/modules/data/services/SkillService';
import { getUmaImageUrl } from '@/modules/runners/utils';
import { SkillPickerFilterRow } from '@/modules/skills/components/skill-picker/filter-row';
import { SkillPickerProvider } from '@/modules/skills/components/skill-picker/provider';
import { useFilteredSkills } from '@/modules/skills/components/skill-picker/store';
import { SkillIcon } from '@/modules/skills/components/skill-list/skill-item/SkillIcon';
import { SkillDetails } from '@/modules/skills/components/skill-details';
import { formatEffect } from '@/modules/skills/components/formatters';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

const SKILL_CARD_ESTIMATED_HEIGHT = 360;
const SKILL_CARD_GAP = 12;
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

function getRelatedSkills(skill: SkillEntry) {
  const relatedById = new Map<string, SkillEntry>();

  for (const familySkill of dataRegistry.skills.getByGroupId(skill.groupId)) {
    relatedById.set(familySkill.id, familySkill);
  }

  const geneSkillId = skill.gene_version?.id;
  if (geneSkillId) {
    const geneSkill = dataRegistry.skills.getById(`${geneSkillId}`);
    if (geneSkill) {
      relatedById.set(geneSkill.id, geneSkill);
    }
  }

  for (const candidate of dataRegistry.skills.getAll()) {
    if (`${candidate.gene_version?.id ?? ''}` === skill.id) {
      relatedById.set(candidate.id, candidate);
    }
  }

  relatedById.delete(skill.id);

  return Array.from(relatedById.values()).sort((a, b) => b.rarity - a.rarity);
}

type SkillEffectSummaryProps = {
  alternative: SkillEntry['alternatives'][number] | undefined;
};

function SkillEffectSummary(props: SkillEffectSummaryProps) {
  const { alternative } = props;

  if (!alternative) {
    return <div className="text-xs text-muted-foreground">No effects.</div>;
  }

  return (
    <div className="grid gap-1.5">
      {!!alternative.cooldownTime && alternative.cooldownTime > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs">
          <span className="min-w-0 text-muted-foreground">Cooldown</span>
          <span className="text-right font-medium">
            {i18n.t('skilldetails.seconds', { n: alternative.cooldownTime / 10000 })}
          </span>
        </div>
      )}

      {alternative.effects.map((effect) => {
        const modifier = effect.modifier / 10000;
        const effectType = formatEffect[effect.type as keyof typeof formatEffect];
        const effectValue =
          describeRecoveryEffect({ ...effect, modifier }) ??
          (effectType ? effectType(modifier) : modifier);
        const effectLabel =
          effect.type === 9 && modifier < 0
            ? 'HP Drain'
            : i18n.t(`skilleffecttypes.${effect.type}`);
        const effectKey = `${effect.type}-${effect.target}-${effect.modifier}-${effect.valueUsage ?? ''}-${effect.valueLevelUsage ?? ''}`;

        return (
          <div key={effectKey} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-xs">
            <span className="min-w-0 text-muted-foreground">{effectLabel}</span>
            <span className="text-right font-medium">{effectValue}</span>
          </div>
        );
      })}
    </div>
  );
}

type SkillAlternativeEffectSummaryProps = {
  skill: SkillEntry;
};

function SkillAlternativeEffectSummary(props: SkillAlternativeEffectSummaryProps) {
  const { skill } = props;

  if (skill.alternatives.length <= 1) {
    return <SkillEffectSummary alternative={skill.alternatives[0]} />;
  }

  return (
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
            <SkillEffectSummary alternative={alternative} />
          </TabsContent>
        );
      })}
    </Tabs>
  );
}

type RelatedSkillPopoverProps = {
  skill: SkillEntry;
};

type UmaSource = {
  outfitId: number;
  umaId: string;
  name: string;
  outfit: string;
  iconUrl: string;
  needRank: number;
};

function resolveUmaSource(outfitId: number, needRank: number): UmaSource | null {
  const outfitKey = `${outfitId}`;
  const umaId = outfitKey.slice(0, 4);
  const uma = dataRegistry.umas.getById(umaId);

  if (!uma) {
    return null;
  }

  return {
    outfitId,
    umaId,
    name: uma.name[1] || uma.name[0] || umaId,
    outfit: uma.outfits[outfitKey] ?? outfitKey,
    iconUrl: getUmaImageUrl(outfitKey),
    needRank
  };
}

function getSourceRequirementLabel(needRank: number) {
  return needRank > 0 ? `Potential ${needRank}` : 'Base';
}

type SkillSourcesPopoverProps = {
  skill: SkillEntry;
};

function SkillSourcesPopover(props: SkillSourcesPopoverProps) {
  const { skill } = props;

  const umaSources = useMemo(() => {
    const sourceEntries = skill.sources?.length
      ? skill.sources
      : skill.character.map((outfitId) => ({ outfitId, needRank: 0 }));

    return sourceEntries
      .map((source) => resolveUmaSource(source.outfitId, source.needRank))
      .filter((source) => source !== null);
  }, [skill.character, skill.sources]);

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" disabled={umaSources.length === 0}>
            <UsersIcon className="size-3" />
            Sources{umaSources.length > 0 ? ` (${umaSources.length})` : ''}
          </Button>
        }
      />
      <PopoverContent
        align="start"
        className="w-95 border border-border bg-card p-4 text-card-foreground ring-0"
      >
        <PopoverHeader className="border-b border-border pb-3">
          <PopoverTitle className="text-xs">Sources</PopoverTitle>
          <PopoverDescription className="sr-only">{skill.name}</PopoverDescription>
        </PopoverHeader>

        {umaSources.length > 0 ? (
          <section className="grid gap-1">
            <div className="text-xs font-medium">Umas</div>
            <div className="grid gap-1">
              {umaSources.map((source) => (
                <div
                  key={source.outfitId}
                  className="flex items-center gap-4 rounded-md bg-background p-2 text-foreground"
                >
                  <img
                    src={source.iconUrl}
                    alt=""
                    className="size-16 rounded-full object-cover"
                    loading="lazy"
                  />

                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className="truncate text-xs text-muted-foreground">{source.outfit}</div>
                      <Badge variant="outline" className="h-4 rounded px-1 text-[10px]">
                        {getSourceRequirementLabel(source.needRank)}
                      </Badge>
                    </div>
                    <div className="truncate text-sm font-semibold leading-tight">
                      {source.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-sm text-muted-foreground">No known sources.</div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function RelatedSkillPopover(props: RelatedSkillPopoverProps) {
  const { skill } = props;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm">
            <span className="[&_img]:size-4">
              <SkillIcon iconId={skill.iconId} />
            </span>
            <span className="min-w-0 truncate">{skill.name}</span>
          </Button>
        }
      />
      <PopoverContent align="start" className="min-w-50">
        <PopoverHeader>
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
            <SkillIcon iconId={skill.iconId} />

            <div className="min-w-0">
              <PopoverTitle className="truncate">{skill.name}</PopoverTitle>
              <PopoverDescription className="font-mono text-xs">{skill.id}</PopoverDescription>
            </div>
          </div>
        </PopoverHeader>

        <div className="flex gap-1">
          {skill.baseCost > 0 && <Badge variant="outline">{skill.baseCost} SP</Badge>}
          <Badge variant="outline">{getRarityLabel(skill.rarity)}</Badge>
        </div>

        <section className="grid gap-1.5">
          <div className="text-xs font-medium text-muted-foreground">Effects</div>

          <SkillAlternativeEffectSummary skill={skill} />
        </section>
      </PopoverContent>
    </Popover>
  );
}

function SkillFamily(props: SkillFamilyProps) {
  const { skill } = props;

  const familySkills = useMemo(() => {
    return getRelatedSkills(skill);
  }, [skill]);

  if (familySkills.length === 0) {
    return <div className="text-xs text-muted-foreground">None</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-2">
      {familySkills.map((familySkill) => (
        <RelatedSkillPopover key={familySkill.id} skill={familySkill} />
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
    <div className="flex flex-col gap-1 rounded-lg border bg-card">
      <div className="flex flex-col md:flex-row md:items-center">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 border-b px-4 py-2 md:border-none">
          <SkillIcon iconId={skill.iconId} />

          <div className="flex flex-col gap-2">
            <div className="text-sm">{skill.name}</div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Badge variant="outline">
                <span>ID:</span>
                <span>{skill.id}</span>
              </Badge>

              <div className="flex gap-2">
                {skill.baseCost > 0 && <Badge variant="outline">{skill.baseCost} SP</Badge>}
                <Badge variant="outline">{getRarityLabel(skill.rarity)}</Badge>
                <SkillSourcesPopover skill={skill} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 px-4 py-2 border-b md:border-none">
          <section className="flex flex-col gap-2">
            <div className="text-xs text-muted-foreground">Related skills</div>
            <SkillFamily skill={skill} />
          </section>
        </div>
      </div>

      <div className="flex flex-col px-4 text-xs md:py-2">
        <SkillDetails skill={skill} />
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
    estimateSize: () => SKILL_CARD_ESTIMATED_HEIGHT,
    gap: SKILL_CARD_GAP,
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
                  ref={rowVirtualizer.measureElement}
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
