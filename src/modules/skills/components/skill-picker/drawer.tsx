import { XIcon } from 'lucide-react';
import { useRef } from 'react';
import { SkillPickerContent } from './content';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader } from '@/components/ui/drawer';

import { SkillPickerProvider } from './provider';

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

  const childRef = useRef<{ focus: () => void }>(null);

  return (
    <SkillPickerProvider>
      <Drawer
        direction="right"
        open={open}
        onOpenChange={onOpenChange}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- Vaul drawer autoFocus is intentional to move focus into the picker on open
        autoFocus
      >
        <DrawerContent className="px-2 w-full! md:w-1/2! max-w-none!" data-vaul-no-drag>
          <DrawerHeader className="flex-row items-center justify-between">
            <DrawerClose tabIndex={-1} aria-label="Close skill picker">
              <XIcon className="size-4" />
            </DrawerClose>
          </DrawerHeader>

          <SkillPickerContent
            ref={childRef}
            umaId={umaId}
            options={options}
            currentSkills={currentSkills}
            onSelect={onSelect}
            columnCount={1}
          />
        </DrawerContent>
      </Drawer>
    </SkillPickerProvider>
  );
}
