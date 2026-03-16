import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { SkillEntry } from '@/modules/data/skills';
import { SkillIcon } from './skill-list/SkillItem';
import i18n from '@/i18n';
import { useCallback, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HintLevel } from '@/modules/skill-planner/types';
import { calculateSkillCost } from '@/modules/skill-planner/cost-calculator';
import {
  setBought,
  setHintLevel,
  useSkillCostMetaStore,
  useRunnerHasFastLearner,
  useSkillCostMeta,
} from '@/modules/skills/stores/skill-cost-meta.store';
import type { SkillCostMeta } from '@/modules/skills/stores/skill-cost-meta.store';
import { getBaseTier, getUpgradeTier, getWhiteVersion } from '@/modules/skills/skill-relationships';
import { skillCollection } from '@/modules/data/skills';

type SkillCostDetailsProps = {
  id: string;
  skill: SkillEntry;
  runnerId?: string;
};

const HINT_LEVEL_OPTIONS: Array<{ value: HintLevel; label: string }> = [
  { value: 0, label: 'None (0%)' },
  { value: 1, label: 'Lvl 1 (10%)' },
  { value: 2, label: 'Lvl 2 (20%)' },
  { value: 3, label: 'Lvl 3 (30%)' },
  { value: 4, label: 'Lvl 4 (35%)' },
  { value: 5, label: 'Lvl 5 (40%)' },
];

const getHintLevelLabel = (hintLevel: HintLevel) => {
  return HINT_LEVEL_OPTIONS.find((option) => option.value === hintLevel)?.label ?? 'None (0%)';
};

const DEFAULT_META: SkillCostMeta = { hintLevel: 0 };

type SkillCostRequisiteItemProps = {
  runnerId: string;
  hasFastLearner: boolean;
  prereq: { id: string; skill: SkillEntry };
};

export const SkillCostRequisiteItem = (props: SkillCostRequisiteItemProps) => {
  const { runnerId, hasFastLearner, prereq } = props;
  const meta = useSkillCostMeta(runnerId, prereq.id);
  const hintLevel = meta.hintLevel;
  const bought = meta.bought ?? false;

  const prereqNetCost = bought ? 0 : calculateSkillCost(prereq.id, hintLevel, hasFastLearner);
  const boughtCheckboxId = `${runnerId ?? 'runner'}-${prereq.id}-bought`;

  return (
    <div key={prereq.id} className="border rounded-sm p-2 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SkillIcon iconId={prereq.skill.iconId} />
          <div className="min-w-0">
            <div className="font-medium leading-tight truncate">{prereq.skill.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {i18n.t('skilldetails.id')}
              {prereq.id}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Checkbox
            id={boughtCheckboxId}
            checked={bought}
            onCheckedChange={(checked) => setBought(runnerId, prereq.id, checked === true)}
            disabled={!runnerId}
          />
          <Label htmlFor={boughtCheckboxId} className="text-xs">
            Bought
          </Label>
        </div>
      </div>

      {!bought && (
        <div className="grid grid-cols-[1fr_auto] gap-y-1 gap-x-3 items-center">
          <span className="text-muted-foreground">Base Cost</span>
          <span className="font-medium">{prereq.skill.baseCost} SP</span>

          <span className="text-muted-foreground">Hint Lvl</span>
          <Select
            value={hintLevel}
            onValueChange={(value) => setHintLevel(runnerId, prereq.id, value ?? 0)}
            disabled={!runnerId}
          >
            <SelectTrigger className="h-7 w-[148px] text-xs">
              <SelectValue>{getHintLevelLabel(hintLevel)}</SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              {HINT_LEVEL_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground">Net Cost</span>
          <span className="font-semibold">{prereqNetCost} SP</span>
        </div>
      )}
    </div>
  );
};

export const SkillCostDetails = (props: SkillCostDetailsProps) => {
  const { id, skill, runnerId: runnerIdProp } = props;
  const baseSkillId = useMemo(() => id.split('-')[0] ?? id, [id]);

  const runnerId = useMemo(() => runnerIdProp as string, [runnerIdProp]);

  const selfMeta = useSkillCostMeta(runnerId, id);
  const hintLevel = selfMeta.hintLevel;
  const hasFastLearner = useRunnerHasFastLearner(runnerId);

  const isSimpleWhiteSkill = skill.rarity === 1;

  const isGoldSkill = skill.rarity === 2;

  const goldPrereqSkillIds = useMemo(() => {
    if (!isGoldSkill) {
      return [] as Array<string>;
    }

    const whiteVersionId = getWhiteVersion(baseSkillId);
    if (!whiteVersionId) {
      return [] as Array<string>;
    }

    const baseTierId = getBaseTier(whiteVersionId);
    const upgradeTierId = getUpgradeTier(baseTierId);
    const prereqIds = [baseTierId, upgradeTierId].filter((skillId): skillId is string =>
      Boolean(skillId && skillId !== baseSkillId),
    );

    return Array.from(new Set(prereqIds));
  }, [baseSkillId, isGoldSkill]);

  const goldPrereqSkills = useMemo(() => {
    return goldPrereqSkillIds.map((skillId) => ({
      id: skillId,
      skill: skillCollection[skillId],
    }));
  }, [goldPrereqSkillIds]);

  const skillMetaByKey = useSkillCostMetaStore((state) => state.skillMetaByKey);

  const prereqMetaBySkillId = useMemo(() => {
    const acc: Record<string, SkillCostMeta> = {};
    for (const skillId of goldPrereqSkillIds) {
      const key = `${runnerId}:${skillId}`;
      acc[skillId] = skillMetaByKey[key] ?? DEFAULT_META;
    }
    return acc;
  }, [skillMetaByKey, runnerId, goldPrereqSkillIds]);

  const netCost = useMemo(
    () => calculateSkillCost(id, hintLevel, hasFastLearner),
    [hasFastLearner, hintLevel, id],
  );

  const goldTotals = useMemo(() => {
    if (!isGoldSkill) {
      return null;
    }

    let baseCost = skill.baseCost;
    let prereqNetCost = 0;

    for (const prereq of goldPrereqSkills) {
      const meta = prereqMetaBySkillId[prereq.id];
      const isBought = meta?.bought ?? false;

      if (!isBought) {
        baseCost += prereq.skill.baseCost;
        const prereqHintLevel = meta?.hintLevel ?? 0;
        prereqNetCost += calculateSkillCost(prereq.id, prereqHintLevel, hasFastLearner);
      }
    }

    return {
      baseCost,
      netCost: netCost + prereqNetCost,
    };
  }, [goldPrereqSkills, hasFastLearner, isGoldSkill, netCost, prereqMetaBySkillId, skill.baseCost]);

  const handleHintLevelChange = useCallback(
    (skillId: string, value: HintLevel) => {
      setHintLevel(runnerId, skillId, value);
    },
    [runnerId],
  );

  return (
    <div className={cn('bg-background border-2 rounded-b-sm flex flex-col')}>
      <div className="text-sm p-2">
        <div className="flex flex-col gap-1 mb-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">Cost details</div>
          </div>
        </div>
      </div>

      <Separator />

      <div className="p-2 text-xs">
        {isSimpleWhiteSkill ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <SkillIcon iconId={skill.iconId} />
              <div className="min-w-0">
                <div className="font-medium leading-tight truncate">{skill.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {i18n.t('skilldetails.id')}
                  {id}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Base Cost</span>
              <span className="font-medium">{skill.baseCost} SP</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Hint Lvl</span>
              <Select
                value={hintLevel}
                onValueChange={(value) => handleHintLevelChange(id, value ?? 0)}
                disabled={!runnerId}
              >
                <SelectTrigger className="h-7 w-[148px] text-xs">
                  <SelectValue>{getHintLevelLabel(hintLevel)}</SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  {HINT_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <span className="text-muted-foreground">Net Cost</span>
              <span className="text-sm font-semibold">{netCost} SP</span>
            </div>
          </div>
        ) : isGoldSkill ? (
          <div className="flex flex-col gap-2">
            {goldPrereqSkills.map((prereq) => (
              <SkillCostRequisiteItem
                key={prereq.id}
                runnerId={runnerId}
                hasFastLearner={hasFastLearner}
                prereq={prereq}
              />
            ))}

            <div className="border rounded-sm p-2 flex flex-col gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <SkillIcon iconId={skill.iconId} />
                <div className="min-w-0">
                  <div className="font-medium leading-tight truncate">{skill.name}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {i18n.t('skilldetails.id')}
                    {id}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-y-1 gap-x-3 items-center">
                <span className="text-muted-foreground">Base Cost</span>
                <span className="font-medium">{skill.baseCost} SP</span>

                <span className="text-muted-foreground">Hint Lvl</span>
                <Select
                  value={hintLevel}
                  onValueChange={(value) => handleHintLevelChange(id, value ?? 0)}
                >
                  <SelectTrigger className="h-7 w-[148px] text-xs">
                    <SelectValue>{getHintLevelLabel(hintLevel)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent align="end">
                    {HINT_LEVEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-muted-foreground">Net Cost</span>
                <span className="font-semibold">{netCost} SP</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t pt-2">
              <span className="text-muted-foreground">Totals</span>
              <span className="font-semibold">
                {goldTotals?.baseCost ?? skill.baseCost} SP base / {goldTotals?.netCost ?? netCost}{' '}
                SP
                {' net'}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground">
            More cost detail variants will appear here for this skill type.
          </div>
        )}
      </div>
    </div>
  );
};
