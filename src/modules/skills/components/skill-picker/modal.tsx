import { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { SkillPickerContent } from './content';
import { SkillPickerProvider } from './provider';

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
  const { open, umaId, options, currentSkills, onSelect, onOpenChange, allowDuplicateSkills } =
    props;

  const childRef = useRef<{ focus: () => void }>(null);
  const isMobile = useIsMobile();

  return (
    <SkillPickerProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex flex-col h-dvh md:h-[90dvh] min-h-0 max-w-full md:max-w-[1200px]!"
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
              columnCount={isMobile ? 1 : 4}
              allowDuplicateSkills={allowDuplicateSkills}
            />
          </div>
        </DialogContent>
      </Dialog>
    </SkillPickerProvider>
  );
};
