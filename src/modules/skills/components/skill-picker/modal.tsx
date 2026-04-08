import { useRef } from 'react';
import { SkillPickerProvider } from './provider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SkillPickerContent } from './content';

type SkillPickerDrawerProps = {
  open: boolean;
  umaId: string | undefined;
  options: Array<string>;
  currentSkills: Array<string>;
  onSelect: (skills: Array<string>) => void;
  onOpenChange: (open: boolean) => void;
  allowDuplicateSkills?: boolean;
};

export const SkillPickerModal = (props: SkillPickerDrawerProps) => {
  const { open, umaId, options, currentSkills, onSelect, onOpenChange, allowDuplicateSkills } = props;

  const childRef = useRef<{ focus: () => void }>(null);

  return (
    <SkillPickerProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex flex-col h-dvh md:h-[50dvh] min-h-0 max-w-full md:max-w-3xl!"
          autoFocus
        >
          <DialogHeader>
            <DialogTitle>Skill Picker</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col min-h-0 h-full">
            <SkillPickerContent
              ref={childRef}
              umaId={umaId}
              options={options}
              currentSkills={currentSkills}
              onSelect={onSelect}
              allowDuplicateSkills={allowDuplicateSkills}
            />
          </div>
        </DialogContent>
      </Dialog>
    </SkillPickerProvider>
  );
};
