import { useMemo, useState } from 'react';

import { SkillItem } from '@/modules/skills/components/skill-list/SkillItem';

import { RunnerState } from './types';

import {
  getSelectableSkillsForUma,
  getSkillDataById,
  getUniqueSkillForByUmaId,
} from '@/modules/skills/utils';

import { StrategySelect } from '@/modules/runners/components/StrategySelect';
import { MoodSelect } from '@/modules/runners/components/MoodSelect';
import { AptitudeSelect } from '@/modules/runners/components/AptitudeSelect';
import { StatInput } from '@/modules/runners/components/StatInput';
import { UmaSelector } from '@/modules/runners/components/runner-selector';
import { OcrImportDialog } from '@/modules/runners/components/ocr-import-dialog';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';

import './styles.css';
import { Label } from '@/components/ui/label';
import { openSkillPicker, updateCurrentSkills } from '@/modules/skills/store';
import { Mood } from '@simulation/lib/RaceParameters';
import { Button } from '@/components/ui/button';

const runawaySkillId = '202051' as const;

type RunnerCardProps = {
  value: RunnerState;
  onChange: (value: RunnerState) => void;
  onReset: () => void;
  courseDistance: number;
};

export const RunnerCard = (props: RunnerCardProps) => {
  const { value: state, onChange: onChange, onReset } = props;

  const umaId = state.outfitId;

  // OCR Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const handleSetSkills = (skills: string[]) => {
    onChange({ ...state, skills: skills });
    updateCurrentSkills(skills);

    if (skills.includes(runawaySkillId) && state.strategy !== 'Oonige') {
      onChange({ ...state, strategy: 'Oonige' });
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
    const newSkills = state.skills.filter(
      (skillId) => getSkillDataById(skillId).rarity < 3,
    );

    if (outfitId) {
      newSkills.push(getUniqueSkillForByUmaId(outfitId));
    }

    onChange({ ...state, outfitId: outfitId, skills: newSkills });
  }

  const handlePositionChange = (skillId: string, value: string) => {
    const numValue = parseFloat(value);
    if (value === '' || isNaN(numValue)) {
      // Clear the forced position
      const newForcedSkillPositions = {
        ...state.forcedSkillPositions,
        [skillId]: undefined,
      };

      onChange({
        ...state,
        forcedSkillPositions: newForcedSkillPositions,
      });
    } else {
      // Set the forced position
      const newForcedSkillPositions = {
        ...state.forcedSkillPositions,
        [skillId]: numValue,
      };

      onChange({
        ...state,
        forcedSkillPositions: newForcedSkillPositions,
      });
    }
  };

  const handleUpdateStat =
    (prop: 'speed' | 'stamina' | 'power' | 'guts' | 'wisdom') =>
    (value: number) => {
      onChange({ ...state, [prop]: value });
    };

  const handleUpdateAptitude =
    (prop: 'surfaceAptitude' | 'distanceAptitude' | 'strategyAptitude') =>
    (value: string) => {
      onChange({ ...state, [prop]: value });
    };

  const hasRunawaySkill = state.skills.includes(runawaySkillId);

  const handleUpdateStrategy = (value: string) => {
    const hasRunawaySkill = state.skills.includes(runawaySkillId);
    const shouldForceRunaway = hasRunawaySkill && value !== 'Oonige';

    if (shouldForceRunaway) {
      onChange({ ...state, strategy: 'Oonige' });
      return;
    }

    onChange({ ...state, strategy: value });
  };

  const handleUpdateMood = (value: Mood) => {
    onChange({ ...state, mood: value });
  };

  const umaUniqueSkillId = useMemo(
    () => getUniqueSkillForByUmaId(umaId),
    [umaId],
  );

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

    switch (eventType) {
      case 'remove-skill':
        handleRemoveSkill(eventElement.dataset.skillid);
        break;
      default:
        break;
    }
  };

  return (
    <div className="runner-card flex flex-col gap-4 p-2">
      <UmaSelector
        value={umaId}
        select={handleChangeRunner}
        onReset={onReset}
        onImport={() => setImportDialogOpen(true)}
      />

      <OcrImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onApply={handleOcrImportApply}
      />

      <div className="grid grid-cols-5 rounded-sm border-2">
        <div className="flex items-center gap-2 bg-primary rounded-tl-sm">
          <img src="/icons/status_00.png" className="w-4 h-4" />
          <span className="text-white text-sm">Speed</span>
        </div>
        <div className="flex items-center gap-2 bg-primary">
          <img src="/icons/status_01.png" className="w-4 h-4" />
          <span className="text-white text-sm">Stamina</span>
        </div>
        <div className="flex items-center gap-2 bg-primary">
          <img src="/icons/status_02.png" className="w-4 h-4" />
          <span className="text-white text-sm">Power</span>
        </div>
        <div className="flex items-center gap-2 bg-primary">
          <img src="/icons/status_03.png" className="w-4 h-4" />
          <span className="text-white text-sm">Guts</span>
        </div>
        <div className="flex items-center gap-2 bg-primary rounded-tr-sm">
          <img src="/icons/status_04.png" className="w-4 h-4" />
          <span className="text-white text-sm">Wit</span>
        </div>

        <StatInput value={state.speed} onChange={handleUpdateStat('speed')} />
        <StatInput
          value={state.stamina}
          onChange={handleUpdateStat('stamina')}
        />
        <StatInput value={state.power} onChange={handleUpdateStat('power')} />
        <StatInput value={state.guts} onChange={handleUpdateStat('guts')} />
        <StatInput value={state.wisdom} onChange={handleUpdateStat('wisdom')} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2">Surface aptitude:</Label>
          <AptitudeSelect
            value={state.surfaceAptitude}
            onChange={handleUpdateAptitude('surfaceAptitude')}
          />
        </div>

        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2">Distance aptitude:</Label>
          <AptitudeSelect
            value={state.distanceAptitude}
            onChange={handleUpdateAptitude('distanceAptitude')}
          />
        </div>

        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2">Style:</Label>
          <StrategySelect
            value={state.strategy}
            onChange={handleUpdateStrategy}
            disabled={hasRunawaySkill}
          />
        </div>

        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2">Style aptitude:</Label>
          <AptitudeSelect
            value={state.strategyAptitude}
            onChange={handleUpdateAptitude('strategyAptitude')}
          />
        </div>

        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2">Mood:</Label>
          <MoodSelect value={state.mood} onChange={handleUpdateMood} />
        </div>
      </div>

      <div className="bg-primary text-white font-bold rounded-sm flex items-center h-8">
        <div className="flex-1 text-center">Skills</div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenSkillPicker}
          className="w-24 rounded-none rounded-r-sm"
        >
          Open
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2" onClick={handleSkillClick}>
        {state.skills.map((id: string) => {
          return (
            <SkillItem
              key={id}
              skillId={id}
              dismissable={id !== umaUniqueSkillId}
              withDetails
              distanceFactor={props.courseDistance}
              forcedPosition={state.forcedSkillPositions[id] ?? 0}
              onPositionChange={(value: number) => {
                handlePositionChange(id, value.toString());
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
