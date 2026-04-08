import { useRef } from 'react';
import { SkillPickerProvider } from './provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SkillPickerContent } from './content';

type SkillPickerDrawerProps = {
  open: boolean;
  umaId: string;
  options: Array<string>;
  currentSkills: Array<string>;
  onSelect: (skills: Array<string>) => void;
  onOpenChange: (open: boolean) => void;
};

export const SkillPickerModal = (props: SkillPickerDrawerProps) => {
  const { open, umaId, options, currentSkills, onSelect, onOpenChange } = props;

  const childRef = useRef<{ focus: () => void }>(null);

  return (
    <SkillPickerProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-h-[90dvh] min-h-0 max-w-full md:max-w-3xl! overflow-y-hidden"
          autoFocus
        >
          <DialogHeader>
            <DialogTitle>Skill Picker</DialogTitle>
          </DialogHeader>

          <SkillPickerContent
            ref={childRef}
            umaId={umaId}
            options={options}
            currentSkills={currentSkills}
            onSelect={onSelect}
          />
        </DialogContent>
      </Dialog>
    </SkillPickerProvider>
  );
};
