import './SkillList.css';

import { XIcon } from 'lucide-react';
import { useRef } from 'react';
import { SkillPickerContent } from '../skill-picker-content';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import { useBreakpoint } from '@/hooks/useBreakpoint';

type SkillPickerDrawerProps = {
  open: boolean;
  umaId: string;
  options: Array<string>;
  currentSkills: Array<string>;
  onSelect: (skills: Array<string>) => void;
  onOpenChange: (open: boolean) => void;
};

export function SkillPickerDrawer(props: SkillPickerDrawerProps) {
  const { open, umaId, options, currentSkills, onSelect, onOpenChange } = props;

  const { isMobile } = useBreakpoint();

  const childRef = useRef<{ focus: () => void }>(null);

  return (
    <Drawer direction="right" open={open} onOpenChange={onOpenChange} autoFocus>
      <DrawerContent className="px-2 w-full! md:w-1/2! max-w-none!">
        <DrawerHeader className="flex-row items-center justify-between">
          <DrawerClose tabIndex={-1}>
            <XIcon className="w-4 h-4" />
          </DrawerClose>
          <DrawerTitle>Add Skill to Runner</DrawerTitle>
        </DrawerHeader>

        <SkillPickerContent
          ref={childRef}
          umaId={umaId}
          options={options}
          currentSkills={currentSkills}
          onSelect={onSelect}
          isMobile={isMobile}
          className="flex-1 overflow-y-auto lg:overflow-y-hidden lg:min-h-0"
        />
      </DrawerContent>
    </Drawer>
  );
}
