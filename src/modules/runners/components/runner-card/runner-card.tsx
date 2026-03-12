import { useCallback, useMemo, useState } from 'react';

import { CopyPlus, PlusIcon, TrashIcon, Upload } from 'lucide-react';
import { StatsTable } from './stats-table';
import { AptitudesTable } from './aptitudes-table';
import { runawaySkillId } from './types';
import type { RunnerState } from './types';
import type { StatsKey } from './stats-table';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { SkillItem } from '@/modules/skills/components/skill-list/SkillItem';

import {
  getSkillById,
  getSelectableSkillsForUma,
  getUniqueSkillForByUmaId,
  skillsById,
} from '@/modules/skills/utils';

import { OcrImportDialog } from '@/modules/runners/components/ocr-import-dialog';
import { UmaSelector } from '@/modules/runners/components/runner-selector';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { openSkillPicker, updateCurrentSkills } from '@/modules/skills/store';
import {
  setFastLearner,
  useSkillCostMetaStore,
  useRunnerHasFastLearner,
  computeTotalNetCost,
} from '@/modules/skills/stores/skill-cost-meta.store';

type RunnerCardProps = {
  value: RunnerState;
  courseDistance?: number;
  runnerId: string;

  // Events
  onChange: (value: RunnerState) => void;
  onReset: () => void;
  onCopy: () => void;
  onSwap: () => void;

  // Options
  hideSkillButton?: boolean;
  showSkillSpCosts?: boolean;
};

export const RunnerCard = (props: RunnerCardProps) => {
  const {
    value: state,
    onChange,
    onReset,
    onCopy,
    hideSkillButton = false,
    showSkillSpCosts = false,
  } = props;

  const isMobile = useIsMobile();

  const umaId = state.outfitId;

  // OCR Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleSetSkills = useCallback(
    (skills: Array<string>) => {
      onChange({ ...state, skills: skills });
      updateCurrentSkills(skills);

      if (skills.includes(runawaySkillId) && state.strategy !== 'Runaway') {
        onChange({ ...state, strategy: 'Runaway' });
      }
    },
    [onChange, state],
  );

  // Handle OCR import apply
  const handleOcrImportApply = (data: ExtractedUmaData) => {
    const newState: Partial<RunnerState> = {};

    // Apply uma identity
    if (data.outfitId) {
      newState.outfitId = data.outfitId;
    }

    // Apply stats
    if (data.speed) newState.speed = data.speed;
    if (data.stamina) newState.stamina = data.stamina;
    if (data.power) newState.power = data.power;
    if (data.guts) newState.guts = data.guts;
    if (data.wisdom) newState.wisdom = data.wisdom;

    // Apply skills - replace existing with OCR detected ones
    if (data.skills && data.skills.length > 0) {
      const skillIds = data.skills.map((s) => s.id);

      // Add the unique skill for the uma if we detected one
      if (data.outfitId) {
        const uniqueSkillId = getUniqueSkillForByUmaId(data.outfitId);
        if (!skillIds.includes(uniqueSkillId)) {
          skillIds.unshift(uniqueSkillId);
        }
      }

      newState.skills = skillIds;
      updateCurrentSkills(skillIds);
    }

    onChange({ ...state, ...newState });
  };

  const handleChangeRunner = useCallback(
    (outfitId: string) => {
      const newSkills: Array<string> = [];

      for (const skillId of state.skills) {
        const skillData = skillsById.get(skillId);

        if (skillData?.rarity && skillData.rarity < 3) {
          newSkills.push(skillId);
        }
      }

      if (outfitId) {
        newSkills.push(getUniqueSkillForByUmaId(outfitId));
      }

      onChange({ ...state, outfitId: outfitId, skills: newSkills });
    },
    [onChange, state],
  );

  const handleUpdateStat = (prop: StatsKey) => (value: number) => {
    onChange({ ...state, [prop]: value });
  };

  const hasRunawaySkill = state.skills.includes(runawaySkillId);
  const handleRunawayStrategy = () => {
    onChange({ ...state, strategy: 'Runaway' });
  };

  const umaUniqueSkillId = useMemo(() => getUniqueSkillForByUmaId(umaId), [umaId]);
  const skillsWithBaseCost = useMemo(() => {
    return state.skills.map((skillId) => {
      const skill = getSkillById(skillId);

      return {
        skillId,
        baseCost: skill.baseCost,
      };
    });
  }, [state.skills]);

  const hasFastLearner = useRunnerHasFastLearner(
    showSkillSpCosts && props.runnerId !== 'pacer' ? props.runnerId : '',
  );

  const skillMetaByKey = useSkillCostMetaStore((s) => s.skillMetaByKey);

  const netCostBySkillId = useMemo(() => {
    if (!showSkillSpCosts || props.runnerId === 'pacer') return {};
    const map: Record<string, number> = {};
    for (const skillId of state.skills) {
      map[skillId] = computeTotalNetCost(skillId, props.runnerId, skillMetaByKey, hasFastLearner);
    }
    return map;
  }, [props.runnerId, state.skills, showSkillSpCosts, skillMetaByKey, hasFastLearner]);

  const totalSkillSp = useMemo(() => {
    if (!showSkillSpCosts || props.runnerId === 'pacer') {
      return null;
    }

    return Object.values(netCostBySkillId).reduce((sum, cost) => sum + cost, 0);
  }, [showSkillSpCosts, props.runnerId, netCostBySkillId]);

  const fastLearnerCheckboxId = `${props.runnerId}-fast-learner`;
  const handleFastLearnerChange = useCallback(
    (checked: boolean) => {
      if (!showSkillSpCosts || props.runnerId === 'pacer') {
        return;
      }

      setFastLearner(props.runnerId, checked);
    },
    [props.runnerId, showSkillSpCosts],
  );

  const handleRemoveSkill = (skillId: string) => {
    handleSetSkills(state.skills.filter((id) => id !== skillId));
  };

  const handleOpenSkillPicker = useCallback(() => {
    const selectableSkills = getSelectableSkillsForUma(umaId);

    openSkillPicker({
      runnerId: umaId,
      umaId: umaId,
      options: selectableSkills,
      currentSkills: state.skills,
      onSelect: handleSetSkills,
    });
  }, [umaId, state.skills, handleSetSkills]);

  const handleSkillClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;

    const eventElement = target.closest('[data-event]') as HTMLElement;
    if (!eventElement) return;

    const eventType = eventElement.dataset.event;
    if (!eventType) return;

    const skillId = eventElement.dataset.skillid;

    switch (eventType) {
      case 'remove-skill':
        handleRemoveSkill(skillId!);
        break;
      default:
        break;
    }
  };

  return (
    <div className="runner-card flex flex-col gap-4 p-2">
      <div className="flex gap-2">
        <UmaSelector
          value={umaId}
          select={handleChangeRunner}
          onReset={onReset}
          onImport={() => setImportDialogOpen(true)}
          randomMobId={state.randomMobId}
        />

        <div className="grid grid-cols-2 gap-2">
          {!isMobile && (
            <Button
              onClick={() => setImportDialogOpen(true)}
              size="sm"
              variant="outline"
              disabled={isMobile}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline!">Import</span>
            </Button>
          )}

          {props.runnerId !== 'pacer' && (
            <Button onClick={onCopy} size="sm" variant="outline" title="Copy to other runner">
              <CopyPlus className="w-4 h-4" />
              <span className="hidden md:inline!">Duplicate</span>
            </Button>
          )}

          <Button onClick={onReset} title="Reset runner" size="sm">
            <span className="hidden md:inline!">Reset</span>
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <OcrImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onApply={handleOcrImportApply}
      />

      <div className="flex flex-col gap-2" data-tutorial="runner-stats">
        <StatsTable value={state} onChange={handleUpdateStat} />

        <AptitudesTable
          value={state}
          onChange={onChange}
          hasRunawaySkill={hasRunawaySkill}
          onRunawayStrategy={handleRunawayStrategy}
        />
      </div>

      {!hideSkillButton && (
        <div data-tutorial="skills-section" className="flex items-center gap-2">
          <div className="bg-card py-1 px-2 border font-bold rounded-lg flex-1 text-center h-auto flex items-center gap-4">
            <span>Skills</span>

            {showSkillSpCosts && totalSkillSp !== null && (
              <>
                <span className="text-xs font-semibold text-muted-foreground">
                  {totalSkillSp} SP needed
                </span>
                <div className="flex items-center gap-1.5 font-normal">
                  <Checkbox
                    id={fastLearnerCheckboxId}
                    checked={hasFastLearner}
                    onCheckedChange={(checked) => handleFastLearnerChange(checked === true)}
                  />
                  <Label htmlFor={fastLearnerCheckboxId} className="text-xs text-muted-foreground">
                    Fast Learner
                  </Label>
                </div>
              </>
            )}
          </div>

          <Button variant="default" onClick={handleOpenSkillPicker} className="cursor-pointer">
            Add Skills
            <PlusIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {hideSkillButton && (
        <div className="text-sm font-semibold flex items-center gap-2">
          <span>Skills</span>

          {showSkillSpCosts && totalSkillSp !== null && (
            <>
              <span className="text-xs text-muted-foreground">{totalSkillSp} SP</span>

              <div className="flex items-center gap-1.5 font-normal">
                <Checkbox
                  id={fastLearnerCheckboxId}
                  checked={hasFastLearner}
                  onCheckedChange={(checked) => handleFastLearnerChange(checked === true)}
                />
                <Label htmlFor={fastLearnerCheckboxId} className="text-xs text-muted-foreground">
                  Fast Learner
                </Label>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2" onClick={handleSkillClick}>
        {skillsWithBaseCost.map(({ skillId }) => {
          return (
            <SkillItem
              key={skillId}
              skillId={skillId}
              dismissable={skillId !== umaUniqueSkillId}
              withDetails
              distanceFactor={props.courseDistance}
              spCost={showSkillSpCosts ? netCostBySkillId[skillId] : undefined}
              runnerId={showSkillSpCosts ? props.runnerId : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};
