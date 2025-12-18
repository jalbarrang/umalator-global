import './SkillList.css';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

import { useSkillModalStore } from '@/modules/skills/store';
import { useRef } from 'react';
import { SkillPickerContent } from '../skill-picker-content';

export function SkillPickerDrawer() {
  const { open, umaId, options, currentSkills, onSelect } =
    useSkillModalStore();

  const handleOpenChange = (open: boolean) => {
    useSkillModalStore.setState({ open });
  };

  const childRef = useRef<{ focus: () => void }>(null);

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={handleOpenChange}
      autoFocus
    >
      <DrawerContent className="px-2 w-full! md:w-1/2! max-w-none!">
        <DrawerHeader>
          <DrawerTitle>Add Skill to Runner</DrawerTitle>
        </DrawerHeader>

        <SkillPickerContent
          ref={childRef}
          umaId={umaId}
          options={options}
          currentSkills={currentSkills}
          onSelect={onSelect}
          className="flex-1 min-h-0"
        />
      </DrawerContent>
    </Drawer>
  );
}
