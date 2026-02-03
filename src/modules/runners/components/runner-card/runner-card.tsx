import { useMemo, useState } from 'react';

import { ArrowLeftRight, Copy, PlusIcon, TrashIcon, Upload } from 'lucide-react';
import { StatsTable } from './stats-table';
import { AptitudesTable } from './aptitudes-table';
import { runawaySkillId } from './types';
import type { RunnerState } from './types';
import type { StatsKey } from './stats-table';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { SkillItem } from '@/modules/skills/components/skill-list/SkillItem';

import {
  getSelectableSkillsForUma,
  getUniqueSkillForByUmaId,
  skillsById,
} from '@/modules/skills/utils';

import { OcrImportDialog } from '@/modules/runners/components/ocr-import-dialog';
import { UmaSelector } from '@/modules/runners/components/runner-selector';

import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { openSkillPicker, updateCurrentSkills } from '@/modules/skills/store';
import './styles.css';

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
};

export const RunnerCard = (props: RunnerCardProps) => {
  const { value: state, onChange, onReset, onCopy, onSwap, hideSkillButton = false } = props;

  const isMobile = useIsMobile();

  const umaId = state.outfitId;

  // OCR Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleSetSkills = (skills: Array<string>) => {
    onChange({ ...state, skills: skills });
    updateCurrentSkills(skills);

    if (skills.includes(runawaySkillId) && state.strategy !== 'Runaway') {
      onChange({ ...state, strategy: 'Runaway' });
    }
  };

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

  function handleChangeRunner(outfitId: string) {
    const newSkills: Array<string> = [];

    for (const skillId of state.skills) {
      const skillData = skillsById.get(skillId);

      if (skillData?.data?.rarity && skillData.data.rarity < 3) {
        newSkills.push(skillId);
      }
    }

    if (outfitId) {
      newSkills.push(getUniqueSkillForByUmaId(outfitId));
    }

    onChange({ ...state, outfitId: outfitId, skills: newSkills });
  }

  const handlePositionChange = (skillId: string, value: string | undefined) => {
    const numValue = value ? parseFloat(value) : undefined;

    console.log('numValue', numValue);

    if (numValue === undefined || isNaN(numValue)) {
      // Clear the forced position
      const newForcedMap = new Map(Object.entries(state.forcedSkillPositions));
      newForcedMap.delete(skillId);

      onChange({
        ...state,
        forcedSkillPositions: Object.fromEntries(newForcedMap),
      });

      console.log('newForcedMap', newForcedMap);

      return;
    }

    // Set the forced position
    const newForcedSkillPositions = {
      ...state.forcedSkillPositions,
      [skillId]: numValue,
    };

    onChange({
      ...state,
      forcedSkillPositions: newForcedSkillPositions,
    });
  };

  const handleUpdateStat = (prop: StatsKey) => (value: number) => {
    onChange({ ...state, [prop]: value });
  };

  const hasRunawaySkill = state.skills.includes(runawaySkillId);
  const handleRunawayStrategy = () => {
    onChange({ ...state, strategy: 'Runaway' });
  };

  const umaUniqueSkillId = useMemo(() => getUniqueSkillForByUmaId(umaId), [umaId]);

  const handleRemoveSkill = (skillId: string) => {
    handleSetSkills(state.skills.filter((id) => id !== skillId));
  };

  const handleOpenSkillPicker = () => {
    const selectableSkills = getSelectableSkillsForUma(umaId);

    openSkillPicker({
      runnerId: umaId,
      umaId: umaId,
      options: selectableSkills,
      currentSkills: state.skills,
      onSelect: handleSetSkills,
    });
  };

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
              <Copy className="w-4 h-4" />
              <span className="hidden md:inline!">Copy</span>
            </Button>
          )}

          {props.runnerId !== 'pacer' && (
            <Button onClick={onSwap} size="sm" variant="outline" title="Swap runners">
              <ArrowLeftRight className="w-4 h-4" />
              <span className="hidden md:inline!">Swap</span>
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

      <StatsTable value={state} onChange={handleUpdateStat} />

      <AptitudesTable
        value={state}
        onChange={onChange}
        hasRunawaySkill={hasRunawaySkill}
        onRunawayStrategy={handleRunawayStrategy}
      />

      {!hideSkillButton && (
        <div className="flex items-center gap-2">
          <div className="bg-card py-1 border font-bold rounded-lg flex-1 text-center h-auto">
            Skills
          </div>

          <Button variant="default" onClick={handleOpenSkillPicker} className="cursor-pointer">
            Add Skills
            <PlusIcon className="w-4 h-4" />
          </Button>
        </div>
      )}

      {hideSkillButton && <div className="text-sm font-semibold">Skills</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2" onClick={handleSkillClick}>
        {state.skills.map((id: string) => {
          return (
            <SkillItem
              key={id}
              skillId={id}
              dismissable={id !== umaUniqueSkillId}
              withDetails
              distanceFactor={props.courseDistance}
              forcedPosition={state.forcedSkillPositions[id]}
              onPositionChange={(value) => handlePositionChange(id, value)}
            />
          );
        })}
      </div>
    </div>
  );
};
