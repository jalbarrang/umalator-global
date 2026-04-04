import { XIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from '@/components/ui/panel';
import { DebuffGroup, normalizeSkillId } from './DebuffGroup';
import { SkillPickerContent } from '@/modules/skills/components/skill-picker-content';
import { getSkills } from '@/modules/data/skills';
import { isInjectableExternalDebuffSkill } from '@/lib/sunday-tools/skills/external-debuffs';
import {
  addDebuff,
  clearAllDebuffs,
  useDebuffs,
  type CompareRunnerId,
} from '@/modules/simulation/stores/compare.store';

export function DebuffsPanel() {
  const { uma1, uma2 } = useDebuffs();
  const [pickerRunnerId, setPickerRunnerId] = useState<CompareRunnerId | null>(null);
  const [pickerSelection, setPickerSelection] = useState<Array<string>>([]);
  const pickerRef = useRef<{ focus: () => void } | null>(null);

  const isPickerOpen = pickerRunnerId !== null;
  const hasDebuffs = uma1.length > 0 || uma2.length > 0;

  const debuffSkillOptions = useMemo(() => {
    const result: string[] = [];
    const skills = getSkills();

    for (const skill of skills) {
      if (isInjectableExternalDebuffSkill(skill)) {
        result.push(skill.id);
      }
    }

    return result;
  }, []);

  const handleOpenPicker = (runnerId: CompareRunnerId) => {
    setPickerRunnerId(runnerId);
    setPickerSelection([]);
  };

  const handlePickerSelection = (selectedSkills: Array<string>) => {
    setPickerSelection(selectedSkills);
    const selectedSkill = selectedSkills.at(-1);
    if (!selectedSkill || !pickerRunnerId) {
      return;
    }

    addDebuff(pickerRunnerId, normalizeSkillId(selectedSkill), 0);
    setPickerSelection([]);
    setPickerRunnerId(null);
  };

  return (
    <>
      <Panel>
        <PanelHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <PanelTitle>Debuffs</PanelTitle>
              <PanelDescription>Inject debuff skills at fixed race positions.</PanelDescription>
            </div>
            <Button variant="outline" size="sm" onClick={clearAllDebuffs} disabled={!hasDebuffs}>
              Clear all
            </Button>
          </div>
        </PanelHeader>

        <PanelContent className="flex flex-col gap-3">
          <DebuffGroup runnerId="uma1" title="Uma 1" debuffs={uma1} onAdd={handleOpenPicker} />
          <DebuffGroup runnerId="uma2" title="Uma 2" debuffs={uma2} onAdd={handleOpenPicker} />
        </PanelContent>
      </Panel>

      <Drawer
        direction="right"
        open={isPickerOpen}
        onOpenChange={(open) => {
          if (!open) {
            setPickerRunnerId(null);
            setPickerSelection([]);
          }
        }}
        autoFocus
      >
        <DrawerContent className="px-2 w-full! md:w-1/2! max-w-none!">
          <DrawerHeader className="flex-row items-center justify-between">
            <DrawerClose tabIndex={-1} aria-label="Close debuff picker">
              <XIcon className="h-4 w-4" />
            </DrawerClose>
            <DrawerTitle>Add Debuff Skill</DrawerTitle>
          </DrawerHeader>

          <SkillPickerContent
            ref={pickerRef}
            umaId={undefined}
            options={debuffSkillOptions}
            currentSkills={pickerSelection}
            onSelect={handlePickerSelection}
            allowDuplicateSkills
            className="flex-1 overflow-y-auto lg:overflow-y-hidden lg:min-h-0"
          />
        </DrawerContent>
      </Drawer>
    </>
  );
}
