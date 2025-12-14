import './SkillList.css';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useSkillModalStore } from '@/modules/skills/store';
import { SkillPickerContent } from '../skill-picker-content';

export function SkillPickerModal() {
  const { open, umaId, options, currentSkills, onSelect } =
    useSkillModalStore();

  const handleOpenChange = (open: boolean) => {
    useSkillModalStore.setState({ open });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn(['flex flex-col flex-1 gap-3'])}>
        <DialogHeader>
          <DialogTitle>Add Skill to Runner</DialogTitle>
        </DialogHeader>

        <SkillPickerContent
          umaId={umaId}
          options={options}
          currentSkills={currentSkills}
          onSelect={onSelect}
          className="flex-1"
        />
      </DialogContent>
    </Dialog>
  );
}
