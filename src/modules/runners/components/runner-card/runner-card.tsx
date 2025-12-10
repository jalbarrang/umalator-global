import { useMemo, useState } from 'react';

import { SkillItem } from '@/modules/skills/components/skill-list/SkillItem';

import { RunnerState } from './types';

import {
  getSelectableSkillsForUma,
  getUniqueSkillForByUmaId,
  skillsById,
} from '@/modules/skills/utils';

import { AptitudeSelect } from '@/modules/runners/components/AptitudeSelect';
import { MoodSelect } from '@/modules/runners/components/MoodSelect';
import { StatInput } from '@/modules/runners/components/StatInput';
import { StrategySelect } from '@/modules/runners/components/StrategySelect';
import { OcrImportDialog } from '@/modules/runners/components/ocr-import-dialog';
import { UmaSelector } from '@/modules/runners/components/runner-selector';
import type { ExtractedUmaData } from '@/modules/runners/ocr/types';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { openSkillPicker, updateCurrentSkills } from '@/modules/skills/store';
import { ISkill } from '@/modules/skills/types';
import { Mood } from '@simulation/lib/RaceParameters';
import { ArrowLeftRight, Copy, TrashIcon, Upload } from 'lucide-react';
import './styles.css';

const runawaySkillId = '202051' as const;

type RunnerCardProps = {
  value: RunnerState;
  courseDistance: number;
  runnerId: string;

  // Events
  onChange: (value: RunnerState) => void;
  onReset: () => void;
  onCopy: () => void;
  onSwap: () => void;
};

export const RunnerCard = (props: RunnerCardProps) => {
  const { value: state, onChange, onReset, onCopy, onSwap } = props;

  const isMobile = useIsMobile();

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
    const newSkills: string[] = state.skills
      .map((skillId) => skillsById.get(skillId))
      .filter((skill): skill is ISkill => skill !== null && skill.rarity < 3)
      .map((skill) => skill.id.toString());

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
            <Button
              onClick={onCopy}
              size="sm"
              variant="outline"
              title="Copy to other runner"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden md:inline!">Copy</span>
            </Button>
          )}

          {props.runnerId !== 'pacer' && (
            <Button
              onClick={onSwap}
              size="sm"
              variant="outline"
              title="Swap runners"
            >
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

      <div className="grid grid-cols-5 rounded-sm border-2">
        <div className="flex items-center justify-center gap-2 bg-primary rounded-tl-sm">
          <img src="/icons/status_00.png" className="w-4 h-4" />
          <span className="text-white text-xs md:text-sm">Speed</span>
        </div>
        <div className="flex items-center justify-center gap-2 bg-primary">
          <img src="/icons/status_01.png" className="w-4 h-4" />
          <span className="text-white text-xs md:text-sm">Stamina</span>
        </div>
        <div className="flex items-center justify-center gap-2 bg-primary">
          <img src="/icons/status_02.png" className="w-4 h-4" />
          <span className="text-white text-xs md:text-sm">Power</span>
        </div>
        <div className="flex items-center justify-center gap-2 bg-primary">
          <img src="/icons/status_03.png" className="w-4 h-4" />
          <span className="text-white text-xs md:text-sm">Guts</span>
        </div>
        <div className="flex items-center justify-center gap-2 bg-primary rounded-tr-sm">
          <img src="/icons/status_04.png" className="w-4 h-4" />
          <span className="text-white text-xs md:text-sm">Wit</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-2"
        onClick={handleSkillClick}
      >
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
