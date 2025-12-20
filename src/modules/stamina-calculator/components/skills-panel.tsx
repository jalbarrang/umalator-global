import { Plus, X } from 'lucide-react';
import { useStaminaCalculatorStore } from '../store/stamina-calculator.store';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useSkillModalStore } from '@/modules/skills/store';
import { SkillPickerDrawer } from '@/modules/skills/components/skill-list/SkillPickerDrawer';
import { allSkills, getSkillNameById } from '@/modules/skills/utils';
import { SkillQuery } from '@/modules/skills/query';

export function SkillsPanel() {
  const { input, setInput } = useStaminaCalculatorStore();

  const removeRecoverySkill = (skillId: string) => {
    setInput({
      recoverySkills: input.recoverySkills.filter((id) => id !== skillId),
    });
  };

  const removeDebuffSkill = (skillId: string) => {
    setInput({
      debuffSkills: input.debuffSkills.filter((id) => id !== skillId),
    });
  };

  const openRecoveryPicker = () => {
    const options = SkillQuery.from(allSkills)
      .whereAny(['recovery'], (skill, _iconKey) =>
        skill.meta.iconId.startsWith('2002'),
      )
      .execute();

    useSkillModalStore.setState({
      open: true,
      umaId: 'stamina-calc-recovery',
      options: options.map((e) => e.id),
      currentSkills: input.recoverySkills,
      onSelect: (skills) => {
        setInput({ recoverySkills: skills });
        useSkillModalStore.setState({ open: false });
      },
    });
  };

  const openDebuffPicker = () => {
    const options = SkillQuery.from(allSkills)
      .whereAny(['recovery'], (skill, _iconKey) =>
        skill.meta.iconId.startsWith('3005'),
      )
      .execute();

    useSkillModalStore.setState({
      open: true,
      umaId: 'stamina-calc-debuff',
      options: options.map((e) => e.id),
      currentSkills: input.debuffSkills,
      onSelect: (skills) => {
        setInput({ debuffSkills: skills });
        useSkillModalStore.setState({ open: false });
      },
    });
  };

  const getSkillName = (skillId: string) => {
    return getSkillNameById(skillId);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Skills</div>
        <div className="flex items-center gap-2">
          <Label htmlFor="proc-rate" className="text-sm text-muted-foreground">
            Consider Proc Rate
          </Label>
          <Switch
            id="proc-rate"
            checked={input.considerSkillProcRate}
            onCheckedChange={(checked) =>
              setInput({ considerSkillProcRate: checked })
            }
          />
        </div>
      </div>

      <div className="space-y-4">
        {/* Recovery Skills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Recovery Skills (HP+)</Label>
            <Button size="sm" variant="outline" onClick={openRecoveryPicker}>
              <Plus className="w-4 h-4 mr-1" />
              Add Skills
            </Button>
          </div>

          {input.recoverySkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {input.recoverySkills.map((skillId) => (
                <Badge
                  key={skillId}
                  variant="secondary"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="text-xs">{getSkillName(skillId)}</span>
                  <button
                    onClick={() => removeRecoverySkill(skillId)}
                    className="hover:bg-muted rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recovery skills selected
            </p>
          )}
        </div>

        {/* Debuff Skills */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Stamina Drain Debuffs (HP-)
            </Label>
            <Button size="sm" variant="outline" onClick={openDebuffPicker}>
              <Plus className="w-4 h-4 mr-1" />
              Add Debuffs
            </Button>
          </div>

          {input.debuffSkills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {input.debuffSkills.map((skillId) => (
                <Badge
                  key={skillId}
                  variant="destructive"
                  className="flex items-center gap-1 pr-1"
                >
                  <span className="text-xs">{getSkillName(skillId)}</span>
                  <button
                    onClick={() => removeDebuffSkill(skillId)}
                    className="hover:bg-muted rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No debuffs selected</p>
          )}
        </div>
      </div>

      {/* Skill Picker */}
      <SkillPickerDrawer />
    </>
  );
}
