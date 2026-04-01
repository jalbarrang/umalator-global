import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { SkillIcon } from './skill-list/SkillItem';
import i18n from '@/i18n';
import { memo, useMemo } from 'react';
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
import { getRepresentativePrerequisiteIds } from '@/modules/skill-planner/skill-family';
import { skillCollection } from '@/modules/data/skills';
import { useSkillItem } from './skill-list/skill-item.context';

const HINT_LEVEL_OPTIONS: Array<{ value: HintLevel; label: string }> = [
  { value: 0, label: 'No hint' },
  { value: 1, label: 'Lvl 1 (10%)' },
  { value: 2, label: 'Lvl 2 (20%)' },
  { value: 3, label: 'Lvl 3 (30%)' },
  { value: 4, label: 'Lvl 4 (35%)' },
  { value: 5, label: 'Lvl Max (40%)' },
];

const getHintLevelLabel = (hintLevel: HintLevel) => {
  return HINT_LEVEL_OPTIONS.find((option) => option.value === hintLevel)?.label ?? 'None (0%)';
};

type PrereqItemProps = {
  prereqId: string;
};

const PrereqItem = memo((props: PrereqItemProps) => {
  const { prereqId } = props;
  const { runnerId, hasFastLearner, getSkillMeta, onHintLevelChange, onBoughtChange } =
    useSkillItem();

  const prereqSkill = useMemo(() => skillCollection[prereqId], [prereqId]);
  const meta = useMemo(() => getSkillMeta(prereqId), [getSkillMeta, prereqId]);
  const hintLevel = meta.hintLevel as HintLevel;
  const bought = meta.bought ?? false;

  const prereqNetCost = useMemo(
    () => (bought ? 0 : calculateSkillCost(prereqId, hintLevel as HintLevel, hasFastLearner)),
    [bought, prereqId, hintLevel, hasFastLearner],
  );

  const boughtCheckboxId = `${runnerId ?? 'runner'}-${prereqId}-bought`;

  return (
    <div className="border rounded-sm p-2 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <SkillIcon iconId={prereqSkill.iconId} />
          <div className="min-w-0">
            <div className="font-medium leading-tight truncate">{prereqSkill.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {i18n.t('skilldetails.id')}
              {prereqId}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Checkbox
            id={boughtCheckboxId}
            checked={bought}
            onCheckedChange={(checked) => onBoughtChange?.(prereqId, checked === true)}
            disabled={!onBoughtChange}
          />
          <Label htmlFor={boughtCheckboxId} className="text-xs">
            Bought
          </Label>
        </div>
      </div>

      {!bought && (
        <div className="grid grid-cols-[1fr_auto] gap-y-1 gap-x-3 items-center">
          <span className="text-muted-foreground">Base Cost</span>
          <span className="font-medium">{prereqSkill.baseCost} SP</span>

          <span className="text-muted-foreground">Hint Lvl</span>
          <Select
            value={hintLevel}
            onValueChange={(value) => onHintLevelChange?.(prereqId, value ?? 0)}
            disabled={!onHintLevelChange}
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
});

/**
 * Cost breakdown popover content. Reads all state and callbacks from SkillItemContext
 * so it works identically in compare mode and the skill planner.
 */
export const SkillCostDetails = () => {
  const { skill, hasFastLearner, getSkillMeta, onHintLevelChange, onBoughtChange } = useSkillItem();

  const id = skill.id;
  const baseSkillId = useMemo(() => id.split('-')[0] ?? id, [id]);

  const selfMeta = useMemo(() => getSkillMeta(id), [getSkillMeta, id]);
  const hintLevel = selfMeta.hintLevel as HintLevel;
  const isObtained = selfMeta.bought ?? false;

  const representativePrereqIds = useMemo(
    () => getRepresentativePrerequisiteIds(baseSkillId),
    [baseSkillId],
  );
  const hasPrerequisites = representativePrereqIds.length > 0;

  const netCost = useMemo(
    () => calculateSkillCost(id, hintLevel, hasFastLearner),
    [hasFastLearner, hintLevel, id],
  );

  const representativeTotals = useMemo(() => {
    if (!hasPrerequisites) return null;

    let baseCost = skill.baseCost;
    let prereqNetCost = 0;

    for (const prereqId of representativePrereqIds) {
      const prereqSkill = skillCollection[prereqId];
      const meta = getSkillMeta(prereqId);
      const isBought = meta.bought ?? false;

      if (!isBought) {
        baseCost += prereqSkill.baseCost;
        prereqNetCost += calculateSkillCost(prereqId, meta.hintLevel as HintLevel, hasFastLearner);
      }
    }

    return { baseCost, netCost: netCost + prereqNetCost };
  }, [representativePrereqIds, hasFastLearner, hasPrerequisites, netCost, getSkillMeta, skill.baseCost]);

  const obtainedCheckboxId = `cost-details-${id}-obtained`;

  return (
    <div className={cn('bg-background border-2 rounded-b-sm flex flex-col')}>
      <div className="text-sm p-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">Cost details</div>
          {onBoughtChange && (
            <div className="flex items-center gap-1.5">
              <Checkbox
                id={obtainedCheckboxId}
                checked={isObtained}
                onCheckedChange={(checked) => onBoughtChange(id, checked === true)}
              />
              <Label htmlFor={obtainedCheckboxId} className="text-xs cursor-pointer font-normal">
                Obtained
              </Label>
            </div>
          )}
        </div>
      </div>

      <Separator />

      <div className="p-2 text-xs">
        {isObtained ? (
          <div className="text-center text-muted-foreground py-2">
            Skill already obtained — no cost.
          </div>
        ) : !hasPrerequisites ? (
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
                onValueChange={(value) => onHintLevelChange?.(id, value ?? 0)}
                disabled={!onHintLevelChange}
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
        ) : (
          <div className="flex flex-col gap-2">
            {representativePrereqIds.map((prereqId) => (
              <PrereqItem key={prereqId} prereqId={prereqId} />
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
                  onValueChange={(value) => onHintLevelChange?.(id, value ?? 0)}
                  disabled={!onHintLevelChange}
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
                {representativeTotals?.baseCost ?? skill.baseCost} SP base /{' '}
                {representativeTotals?.netCost ?? netCost}{' '}
                SP
                {' net'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
