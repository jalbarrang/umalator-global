import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Panel,
  PanelContent,
  PanelDescription,
  PanelHeader,
  PanelTitle,
} from '@/components/ui/panel';
import i18n from '@/i18n';
import { SkillPickerContent } from '@/modules/skills/components/skill-picker-content';
import { getAllSkills } from '@/modules/skills/utils';
import { isInjectableExternalDebuffSkill } from '@/lib/sunday-tools/skills/external-debuffs';
import {
  addDebuff,
  clearAllDebuffs,
  removeDebuff,
  updateDebuffPosition,
  useDebuffs,
  type CompareRunnerId,
} from '@/modules/simulation/stores/compare.store';

function normalizeSkillId(skillId: string) {
  return skillId.split('-')[0] ?? skillId;
}

function getDebuffName(skillId: string) {
  return i18n.t(`skillnames.${normalizeSkillId(skillId)}`);
}

function parsePosition(rawValue: string): number | null {
  const parsed = Number(rawValue.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed);
}

function DebuffGroup({
  runnerId,
  title,
  debuffs,
  onAdd,
}: {
  runnerId: CompareRunnerId;
  title: string;
  debuffs: Array<{ id: string; skillId: string; position: number }>;
  onAdd: (runnerId: CompareRunnerId) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </Label>
        <Button size="sm" variant="outline" onClick={() => onAdd(runnerId)}>
          <PlusIcon className="mr-1 h-4 w-4" />
          Add Debuff
        </Button>
      </div>

      {debuffs.length === 0 && (
        <div className="text-xs text-muted-foreground">No injected debuffs configured.</div>
      )}

      {debuffs.length > 0 && (
        <div className="flex flex-col gap-2">
          {debuffs.map((debuff) => (
            <div
              key={debuff.id}
              className="grid grid-cols-[minmax(0,1fr)_112px_auto] items-center gap-2"
            >
              <div className="truncate text-sm" title={getDebuffName(debuff.skillId)}>
                {getDebuffName(debuff.skillId)}
              </div>
              <Input
                type="number"
                min={0}
                step={10}
                value={debuff.position}
                onChange={(event) => {
                  const nextPosition = parsePosition(event.currentTarget.value);
                  if (nextPosition == null) {
                    return;
                  }
                  updateDebuffPosition(runnerId, debuff.id, nextPosition);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Remove debuff"
                onClick={() => removeDebuff(runnerId, debuff.id)}
              >
                <Trash2Icon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DebuffsPanel() {
  const { uma1, uma2 } = useDebuffs();
  const [pickerRunnerId, setPickerRunnerId] = useState<CompareRunnerId | null>(null);
  const [pickerSelection, setPickerSelection] = useState<Array<string>>([]);
  const pickerRef = useRef<{ focus: () => void } | null>(null);

  const isPickerOpen = pickerRunnerId !== null;
  const hasDebuffs = uma1.length > 0 || uma2.length > 0;

  const debuffSkillOptions = useMemo(() => {
    return getAllSkills()
      .filter((skill) => isInjectableExternalDebuffSkill(skill))
      .map((skill) => skill.id);
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
