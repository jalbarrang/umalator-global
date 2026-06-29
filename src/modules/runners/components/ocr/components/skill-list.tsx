import { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { getSelectableSkillsForUma, getUniqueSkillForByUmaId } from '@/modules/skills/utils';
import { useMemo, useState } from 'react';
import { createManualOcrSkillEntry, getOcrSkillOptionMeta, OcrSkillPickerOption } from '../helpers';
import { skillsService } from '@/modules/data/services/SkillService';
import { toast } from 'sonner';
import { OcrSkillPickerPopover } from './skill-picker';
import { Button } from '@/components/ui/button';
import { Pencil, Plus } from 'lucide-react';
import { OcrDetectedSkillRow } from './skill-row';
import { OcrSkillDebugPanel } from './debug-panel';
import { SkillItem } from '@/modules/skills/components/skill-list/skill-item/item';

type IOcrSkillsListProps = {
  results: Partial<ExtractedUmaData> | null;
  isProcessing: boolean;
  onRemoveSkill: (skillId: string) => void;
  onUpdateResults: (updates: Partial<ExtractedUmaData>) => void;
};

export function OcrSkillsList(props: Readonly<IOcrSkillsListProps>) {
  const { results, isProcessing, onRemoveSkill, onUpdateResults } = props;

  const uniqueSkillId = useMemo(
    () => (results?.outfitId ? getUniqueSkillForByUmaId(results.outfitId) : null),
    [results?.outfitId]
  );
  const currentSkills = useMemo(() => results?.skills ?? [], [results?.skills]);

  const [replacePopoverState, setReplacePopoverState] = useState<{
    anchor: HTMLButtonElement;
    index: number;
  } | null>(null);

  const skillOptions = useMemo<Array<OcrSkillPickerOption>>(() => {
    let selectableSkillIds: string[];

    if (results?.outfitId) {
      selectableSkillIds = getSelectableSkillsForUma(results.outfitId, true);
    } else {
      selectableSkillIds = skillsService.getAll().map((skill) => skill.id);
    }

    return selectableSkillIds
      .flatMap((skillId) => {
        const skill = skillsService.getById(skillId);
        if (!skill) {
          return [];
        }

        const meta = getOcrSkillOptionMeta(skill);
        return [
          {
            id: skill.id,
            name: skill.name,
            meta,
            searchValue: `${skill.name} ${skill.id} ${meta}`
          }
        ];
      })
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }, [results?.outfitId]);

  const handleAddSkill = (skillId: string) => {
    if (currentSkills.some((skill) => skill.id === skillId)) {
      toast.info('That skill is already in the list');
      return;
    }

    const nextSkill = createManualOcrSkillEntry(skillId);
    if (!nextSkill) {
      toast.error('Could not add that skill');
      return;
    }

    onUpdateResults({ skills: [...currentSkills, nextSkill] });
    toast.success('Skill added');
  };

  const handleReplaceSkill = (index: number, skillId: string) => {
    const previous = currentSkills[index];
    if (!previous || previous.id === skillId) {
      return;
    }

    if (currentSkills.some((skill, skillIndex) => skill.id === skillId && skillIndex !== index)) {
      toast.info('That skill is already in the list');
      return;
    }

    const nextSkill = createManualOcrSkillEntry(skillId, previous);
    if (!nextSkill) {
      toast.error('Could not replace that skill');
      return;
    }

    const nextSkills = [...currentSkills];
    nextSkills[index] = nextSkill;
    onUpdateResults({ skills: nextSkills });
    toast.success('Skill updated');
  };

  const handleOpenReplaceSkillPicker = (index: number, anchor: HTMLButtonElement) => {
    setReplacePopoverState({ anchor, index });
  };

  return (
    <>
      <div className="flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Skills ({results?.skills?.length ?? 0} found)
          </h4>

          <OcrSkillPickerPopover
            skillOptions={skillOptions}
            title="Search skill to add"
            onSelectSkill={handleAddSkill}
            trigger={
              <Button type="button" variant="outline" size="sm" disabled={isProcessing}>
                <Plus />
                Add Skill
              </Button>
            }
          />
        </div>

        <div className="flex flex-col flex-1 min-h-0">
          {currentSkills.length === 0 && (
            <div className="p-2 border rounded text-muted-foreground text-sm">
              {isProcessing ? 'Detecting...' : 'No skills detected'}
            </div>
          )}

          <div className="space-y-1 overflow-y-auto h-full p-2">
            {currentSkills.map((skill, index) => (
              <SkillItem key={skill.id} skillId={skill.id} onRemove={onRemoveSkill}>
                <OcrDetectedSkillRow
                  dismissable={skill.id !== uniqueSkillId}
                  onDismiss={() => onRemoveSkill(skill.id)}
                  replaceAction={
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Replace skill"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenReplaceSkillPicker(index, event.currentTarget);
                      }}
                    >
                      <Pencil />
                    </Button>
                  }
                />
              </SkillItem>
            ))}

            <OcrSkillDebugPanel results={results} />
          </div>
        </div>
      </div>

      <OcrSkillPickerPopover
        skillOptions={skillOptions}
        title="Search replacement skill"
        open={replacePopoverState !== null}
        anchor={replacePopoverState?.anchor}
        onOpenChange={(open) => {
          if (!open) {
            setReplacePopoverState(null);
          }
        }}
        onSelectSkill={(skillId) => {
          if (replacePopoverState) {
            handleReplaceSkill(replacePopoverState.index, skillId);
          }
        }}
      />
    </>
  );
}
