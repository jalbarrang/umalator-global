import './SkillList.css';

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

import { useSkillModalStore } from '@/modules/skills/store';
import { SkillPickerContent } from '../skill-picker-content';

export function SkillPickerModal() {
  const { open, umaId, options, currentSkills, onSelect } =
    useSkillModalStore();

  const handleOpenChange = (open: boolean) => {
    useSkillModalStore.setState({ open });
  };

  return (
    <Drawer direction="right" open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="px-2 w-full! md:w-1/3! max-w-none!">
        <DrawerHeader>
          <DrawerTitle>Add Skill to Runner</DrawerTitle>
        </DrawerHeader>

        <SkillPickerContent
          umaId={umaId}
          options={options}
          currentSkills={currentSkills}
          onSelect={onSelect}
        />
      </DrawerContent>
    </Drawer>
  );
}
