import { useState } from 'react';
import { Upload } from 'lucide-react';

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
import { Button } from '@/components/ui/button';

type UmaSelectorProps = {
  value: string;
  select: (outfitId: string) => void;
  onReset: () => void;
  onImport?: () => void;
};

export const UmaSelector = (props: UmaSelectorProps) => {
  const [randomNumber] = useState(() => Math.random());

  const randomId = useMemo(
    () => Math.floor(randomNumber * 624) + 8000,
    [randomNumber],
  );

  const randomMob = useMemo(
    () => `/icons/mob/trained_mob_chr_icon_${randomId}_000001_01.png`,
    [randomId],
  );

  const [open, setOpen] = useState(false);

  const handleSelectedItem = (outfitId: string) => {
    props.select(outfitId);
    setOpen(false);
  };

  const selectedUma = useMemo(() => {
    const uma = umasForSearch.find((uma) => uma.id === props.value);

    if (!uma) return null;

    return {
      outfit: uma.outfit,
      name: uma.name,
    };
  }, [props.value]);

  return (
    <div className="uma-selector">
      <div className="flex">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="flex flex-1 gap-2 cursor-pointer">
              <div className="w-18 h-18">
                <img src={props.value ? icons[props.value] : randomMob} />
              </div>

              {selectedUma && (
                <div className="flex flex-col items-center justify-center">
                  <div className="text-xs font-bold">{selectedUma.outfit}</div>
                  <div className="text-sm">{selectedUma.name}</div>
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
                      <img src={icons[uma.id]} className="w-16 h-16" />
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

        <div className="flex gap-2 justify-end">
          {props.onImport && (
            <Button
              onClick={props.onImport}
              title="Import data from screenshot"
              size="sm"
              variant="outline"
            >
              <Upload className="w-4 h-4" />
              Import
            </Button>
          )}
          <Button
            onClick={props.onReset}
            title="Reset this horse to default stats and skills"
            size="sm"
          >
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};
