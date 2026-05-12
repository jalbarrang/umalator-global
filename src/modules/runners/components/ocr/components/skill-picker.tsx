import { ComponentProps, ReactElement, useState } from 'react';
import { OcrSkillPickerOption } from '../helpers';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

type OcrSkillPickerPopoverProps = {
  skillOptions: Array<OcrSkillPickerOption>;
  title: string;
  trigger?: ReactElement;
  open?: boolean;
  anchor?: ComponentProps<typeof PopoverContent>['anchor'];
  onOpenChange?: (open: boolean) => void;
  onSelectSkill: (skillId: string) => void;
};

export function OcrSkillPickerPopover(props: Readonly<OcrSkillPickerPopoverProps>) {
  const {
    skillOptions,
    title,
    trigger,
    open: controlledOpen,
    anchor,
    onOpenChange,
    onSelectSkill,
  } = props;

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}
    >
      {trigger && <PopoverTrigger render={trigger as ReactElement} />}

      {open && (
        <PopoverContent className="w-[360px] p-0" align="end" anchor={anchor}>
          <Command>
            <CommandInput placeholder={title} />

            <CommandList className="max-h-[400px]">
              <CommandEmpty>No matching skills found.</CommandEmpty>

              <CommandGroup>
                {skillOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.searchValue}
                    onSelect={() => {
                      onSelectSkill(option.id);
                      setOpen(false);
                    }}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm">{option.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{option.meta}</div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  );
}
