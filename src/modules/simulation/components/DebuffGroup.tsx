import { useCallback, type ChangeEvent } from 'react';
import { PlusIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import i18n from '@/i18n';
import { normalizeSkillId } from '@/modules/data/skills';
import {
  SkillItem,
  SkillItemAccessory,
  SkillItemActions,
  SkillItemBody,
  SkillItemDetailsActions,
  SkillItemIdentity,
  SkillItemMain,
  SkillItemRail,
  SkillItemRoot,
} from '@/modules/skills/components/skill-list/skill-item';
import {
  removeDebuff,
  updateDebuffPosition,
  type CompareRunnerId,
} from '@/modules/simulation/stores/compare.store';

type DebuffEntry = {
  id: string;
  skillId: string;
  position: number;
};

function parsePosition(rawValue: string): number | null {
  const parsed = Number(rawValue.trim());
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }
  return Math.round(parsed);
}

type DebuffGroupProps = Readonly<{
  runnerId: CompareRunnerId;
  title: string;
  debuffs: Array<DebuffEntry>;
  onAdd: (runnerId: CompareRunnerId) => void;
}>;

function DebuffRow({
  runnerId,
  debuff,
}: Readonly<{
  runnerId: CompareRunnerId;
  debuff: DebuffEntry;
}>) {
  const handlePositionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextPosition = parsePosition(event.currentTarget.value);
      if (nextPosition == null) {
        return;
      }

      updateDebuffPosition(runnerId, debuff.id, nextPosition);
    },
    [runnerId, debuff.id],
  );

  const handleDismiss = useCallback(() => {
    removeDebuff(runnerId, debuff.id);
  }, [runnerId, debuff.id]);

  return (
    <SkillItem key={debuff.id} skillId={debuff.skillId}>
      <SkillItemRoot interactive={false}>
        <SkillItemRail />
        <SkillItemBody className="p-1 px-2">
          <SkillItemMain>
            <SkillItemIdentity />
            <SkillItemAccessory className="w-[112px]">
              <Input
                type="number"
                min={0}
                step={10}
                value={debuff.position}
                aria-label={`${i18n.t(`skillnames.${normalizeSkillId(debuff.skillId)}`)} position`}
                onChange={handlePositionChange}
              />
            </SkillItemAccessory>
            <SkillItemActions>
              <SkillItemDetailsActions dismissable onDismiss={handleDismiss} />
            </SkillItemActions>
          </SkillItemMain>
        </SkillItemBody>
      </SkillItemRoot>
    </SkillItem>
  );
}

export function DebuffGroup({ runnerId, title, debuffs, onAdd }: DebuffGroupProps) {
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
            <DebuffRow key={debuff.id} runnerId={runnerId} debuff={debuff} />
          ))}
        </div>
      )}
    </div>
  );
}
