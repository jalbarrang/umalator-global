import { useState } from 'react';

import icons from '@data/icons.json';

import { umasForSearch } from '@/modules/runners/utils';
import { useMemo } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

type UmaSelectorProps = {
  value: string;
  select: (outfitId: string) => void;
  onReset: () => void;
  onImport?: () => void;
  randomMobId?: number;
};

export const UmaSelector = (props: UmaSelectorProps) => {
  const [open, setOpen] = useState(false);

  const randomMob = useMemo(
    () =>
      `/icons/mob/trained_mob_chr_icon_${props.randomMobId ?? 8000}_000001_01.png`,
    [props.randomMobId],
  );

  const selectedUma = useMemo(() => {
    const uma = umasForSearch.find((uma) => uma.id === props.value);

    if (!uma) return null;

    return {
      outfit: uma.outfit,
      name: uma.name,
    };
  }, [props.value]);

  const handleSelectedItem = (outfitId: string) => {
    props.select(outfitId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="flex flex-1 gap-2 cursor-pointer">
          <div className="w-18 h-18">
            <img
              src={
                props.value
                  ? icons[props.value as keyof typeof icons]
                  : randomMob
              }
            />
          </div>

          {selectedUma && (
            <div className="flex flex-col items-center justify-center">
              <div className="text-xs font-bold">{selectedUma.outfit}</div>
              <div className="text-sm">{selectedUma.name}</div>
            </div>
          )}
          {!selectedUma && (
            <div className="flex flex-col items-center justify-center">
              <div className="text-sm text-muted-foreground">
                Click me to select a runner
              </div>
            </div>
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search" />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {umasForSearch.map((uma) => (
                <CommandItem
                  key={uma.id}
                  value={`${uma.outfit} ${uma.name}`}
                  onSelect={() => handleSelectedItem(uma.id)}
                >
                  <img
                    src={icons[uma.id as keyof typeof icons]}
                    className="w-16 h-16"
                  />
                  <div>
                    <div className="text-xs font-bold">{uma.outfit}</div>
                    <div className="text-sm">{uma.name}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
