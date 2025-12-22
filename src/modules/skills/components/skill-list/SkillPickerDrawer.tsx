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

import { Button } from '@/components/ui/button';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useSkillModalStore } from '@/modules/skills/store';

export function SkillPickerDrawer() {
  const { open, umaId, options, currentSkills, onSelect } = useSkillModalStore();

  const { isMobile } = useBreakpoint();

  const handleOpenChange = (open: boolean) => {
    useSkillModalStore.setState({ open });
  };

  const childRef = useRef<{ focus: () => void }>(null);

  return (
    <Drawer direction="right" open={open} onOpenChange={handleOpenChange} autoFocus>
      <DrawerContent className="px-2 w-full! md:w-1/2! max-w-none!">
        <DrawerHeader className="flex-row items-center justify-between">
          <DrawerClose>
            <Button variant="ghost" size="icon" tabIndex={-1}>
              <XIcon className="w-4 h-4" />
            </Button>
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
