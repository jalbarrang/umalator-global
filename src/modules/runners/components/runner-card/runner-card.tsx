import { useCallback, useMemo, useRef, useState } from 'react';

import { strategyNames } from '@/lib/sunday-tools/runner/definitions';

import {
  CopyPlus,
  PlusIcon,
  TrashIcon,
  Upload,
  Share2,
  Code,
  Download,
  Camera,
  ChevronDown,
  ClipboardPaste,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ShareCard,
  copyRosterViewCode,
  downloadJson,
  copyScreenshot,
  getSkillsForShareCard,
  ImportCodeDialog,
} from '@/modules/runners/share';
import { getUmaDisplayInfo, getUmaImageUrl } from '@/modules/runners/utils';
import { StatsTable } from './stats-table';
import { AptitudesTable } from './aptitudes-table';
import { runawaySkillId } from './types';
import type { RunnerState } from './types';
import type { StatsKey } from './stats-table';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import {
  SkillItemActions,
  SkillItemBody,
  SkillItemCostAction,
  SkillItemDetailsActions,
  SkillItemIdentity,
  SkillItem,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
  type SkillMeta,
} from '@/modules/skills/components/skill-list/skill-item';
import { skillCollection } from '@/modules/data/skills';

import { getSelectableSkillsForUma, getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { OcrImportDialog } from '@/modules/runners/components/ocr-import-dialog';
import { UmaSelector } from '@/modules/runners/components/runner-selector';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/use-mobile';
import { openSkillPicker, updateCurrentSkills } from '@/modules/skills/store';
import {
  setFastLearner,
  setHintLevel,
  setBought,
  useSkillCostMetaStore,
  useRunnerHasFastLearner,
  getSkillCostMeta,
  computeSkillCostSummary,
} from '@/modules/skills/stores/skill-cost-meta.store';
import type { HintLevel } from '@/modules/skill-planner/types';
import {
  buildDedupedSkillListNetTotal,
  type SkillCostSummary,
} from '@/modules/skills/skill-cost-summary';

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

function RunnerCardSkillRow({
  dismissable,
  showSummary,
}: Readonly<{
  dismissable: boolean;
  showSummary: boolean;
}>) {
  if (showSummary) {
    return (
      <SkillItemRoot size="summary">
        <SkillItemRail />
        <SkillItemBody className="flex-col gap-2">
          <SkillItemMain className="p-1 px-2">
            <SkillItemIdentity />
            <SkillItemDetailsActions dismissable={dismissable} className="shrink-0" />
          </SkillItemMain>
          <SkillItemCostAction layout="summary" />
        </SkillItemBody>
      </SkillItemRoot>
    );
  }

  return (
    <SkillItemRoot>
      <SkillItemRail />
      <SkillItemBody className="p-1 px-2">
        <SkillItemMain>
          <SkillItemIdentity />
          <SkillItemActions>
            <SkillItemCostAction layout="inline" />
            <SkillItemDetailsActions dismissable={dismissable} />
          </SkillItemActions>
        </SkillItemMain>
      </SkillItemBody>
    </SkillItemRoot>
  );
}

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

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [codeImportDialogOpen, setCodeImportDialogOpen] = useState(false);

  const shareCardRef = useRef<HTMLDivElement>(null);

  const umaInfo = useMemo(() => {
    if (!umaId) return null;
    return getUmaDisplayInfo(umaId);
  }, [umaId]);

  const shareImageUrl = useMemo(() => {
    return getUmaImageUrl(umaId, state.randomMobId);
  }, [umaId, state.randomMobId]);

  const shareSkills = useMemo(() => {
    return getSkillsForShareCard(state.skills);
  }, [state.skills]);

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

    // Apply aptitudes and strategy
    if (data.surfaceAptitude) newState.surfaceAptitude = data.surfaceAptitude;
    if (data.distanceAptitude) newState.distanceAptitude = data.distanceAptitude;
    if (data.strategyAptitude) newState.strategyAptitude = data.strategyAptitude;
    if (data.strategy && strategyNames.includes(data.strategy)) {
      newState.strategy = data.strategy;
    }

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
        const skillData = skillCollection[skillId];

        if (skillData?.rarity && skillData.rarity < 3) {
          newSkills.push(skillId);
        }
      }

      if (outfitId) {
        // Add the unique skill for the uma at the beginning of the list
        newSkills.unshift(getUniqueSkillForByUmaId(outfitId));
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

  const isSkillSpCostEnabled = showSkillSpCosts && props.runnerId !== 'pacer';
  const hasFastLearner = useRunnerHasFastLearner(isSkillSpCostEnabled ? props.runnerId : '');

  const skillMetaByKey = useSkillCostMetaStore((s) => s.skillMetaByKey);

  const costSummaryBySkillId = useMemo<Record<string, SkillCostSummary>>(() => {
    if (!isSkillSpCostEnabled) return {};

    const map: Record<string, SkillCostSummary> = {};
    for (const skillId of state.skills) {
      map[skillId] = computeSkillCostSummary(
        skillId,
        props.runnerId,
        skillMetaByKey,
        hasFastLearner,
      );
    }

    return map;
  }, [isSkillSpCostEnabled, props.runnerId, state.skills, skillMetaByKey, hasFastLearner]);

  const totalSkillSp = useMemo(() => {
    if (!isSkillSpCostEnabled) {
      return null;
    }

    return buildDedupedSkillListNetTotal({
      visibleSkillIds: state.skills,
      hasFastLearner,
      getSkillMeta: (targetSkillId) => {
        const key = `${props.runnerId}:${targetSkillId}`;
        return skillMetaByKey[key] ?? { hintLevel: 0 };
      },
    });
  }, [isSkillSpCostEnabled, state.skills, hasFastLearner, props.runnerId, skillMetaByKey]);

  const fastLearnerCheckboxId = `${props.runnerId}-fast-learner`;
  const handleFastLearnerChange = useCallback(
    (checked: boolean) => {
      if (!isSkillSpCostEnabled) {
        return;
      }

      setFastLearner(props.runnerId, checked);
    },
    [isSkillSpCostEnabled, props.runnerId],
  );

  const handleRemoveSkill = useCallback(
    (skillId: string) => {
      handleSetSkills(state.skills.filter((id) => id !== skillId));
    },
    [handleSetSkills, state.skills],
  );

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

  const handleHintLevelChange = useCallback(
    (skillId: string, level: number) => {
      if (!isSkillSpCostEnabled) return;
      setHintLevel(props.runnerId, skillId, level as HintLevel);
    },
    [isSkillSpCostEnabled, props.runnerId],
  );

  const handleBoughtChange = useCallback(
    (skillId: string, bought: boolean) => {
      if (!isSkillSpCostEnabled) return;
      setBought(props.runnerId, skillId, bought);
    },
    [isSkillSpCostEnabled, props.runnerId],
  );

  const getSkillMetaForRunner = useCallback(
    (skillId: string): SkillMeta => {
      if (!isSkillSpCostEnabled) return { hintLevel: 0 };
      return getSkillCostMeta(props.runnerId, skillId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- skillMetaByKey triggers new ref so cost-details re-reads fresh data
    [isSkillSpCostEnabled, props.runnerId, skillMetaByKey],
  );

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
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button size="sm" variant="outline">
                    <Upload className="w-4 h-4" />
                    <span className="hidden md:inline!">Import</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                }
              />
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setImportDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  From Screenshot (OCR)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setCodeImportDialogOpen(true)}>
                  <ClipboardPaste className="h-4 w-4 mr-2" />
                  From Code
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {props.runnerId !== 'pacer' && (
            <Button onClick={onCopy} size="sm" variant="outline" title="Copy to other runner">
              <CopyPlus className="w-4 h-4" />
              <span className="hidden md:inline!">Duplicate</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button size="sm" variant="outline" title="Share runner">
                  <Share2 className="w-4 h-4" />
                  <span className="hidden md:inline!">Share</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => copyRosterViewCode(state)}>
                <Code className="h-4 w-4 mr-2" />
                Copy RosterView Code
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => downloadJson(state, `runner-${umaInfo?.name ?? 'unknown'}.json`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Download JSON
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (shareCardRef.current) copyScreenshot(shareCardRef.current);
                }}
              >
                <Camera className="h-4 w-4 mr-2" />
                Copy Screenshot
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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

      <ImportCodeDialog
        open={codeImportDialogOpen}
        onOpenChange={setCodeImportDialogOpen}
        mode="direct-import"
        onDirectImport={(partialRunner) => {
          onChange({ ...state, ...partialRunner } as RunnerState);
          setCodeImportDialogOpen(false);
        }}
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

      <div
        className={
          isSkillSpCostEnabled ? 'flex flex-wrap items-stretch gap-2' : 'grid grid-cols-1 gap-2'
        }
      >
        {state.skills.map((skillId) => {
          const skillItem = (
            <SkillItem
              key={skillId}
              skillId={skillId}
              distanceFactor={props.courseDistance}
              costSummary={isSkillSpCostEnabled ? costSummaryBySkillId[skillId] : undefined}
              runnerId={isSkillSpCostEnabled ? props.runnerId : undefined}
              hasFastLearner={isSkillSpCostEnabled ? hasFastLearner : undefined}
              onRemove={handleRemoveSkill}
              onHintLevelChange={isSkillSpCostEnabled ? handleHintLevelChange : undefined}
              onBoughtChange={isSkillSpCostEnabled ? handleBoughtChange : undefined}
              getSkillMeta={isSkillSpCostEnabled ? getSkillMetaForRunner : undefined}
            >
              <RunnerCardSkillRow
                dismissable={skillId !== umaUniqueSkillId}
                showSummary={isSkillSpCostEnabled}
              />
            </SkillItem>
          );

          if (!isSkillSpCostEnabled) {
            return skillItem;
          }

          return (
            <div
              key={skillId}
              className="basis-full min-w-0 sm:min-w-[280px] sm:basis-[320px] flex-1"
            >
              {skillItem}
            </div>
          );
        })}
      </div>

      <div style={{ position: 'absolute', left: -9999, top: 0 }}>
        <ShareCard
          ref={shareCardRef}
          runner={state}
          umaInfo={umaInfo}
          imageUrl={shareImageUrl}
          skills={shareSkills}
        />
      </div>
    </div>
  );
};
