import { useState } from 'react';
import { ArrowLeftRight, Copy, TrashIcon, Upload } from 'lucide-react';

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
import { useIsMobile } from '@/hooks/useBreakpoint';

export type RunnerType = 'uma1' | 'uma2' | 'pacer';

type UmaSelectorProps = {
  value: string;
  select: (outfitId: string) => void;
  onReset: () => void;
  onImport?: () => void;
  runnerType?: RunnerType;
  onCopy?: () => void;
  onSwap?: () => void;
  randomMobId?: number;
};

export const UmaSelector = (props: UmaSelectorProps) => {
  const isMobile = useIsMobile();

  const randomMob = useMemo(
    () =>
      `/icons/mob/trained_mob_chr_icon_${props.randomMobId ?? 8000}_000001_01.png`,
    [props.randomMobId],
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
      <div className="flex gap-2">
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

        <div className="grid grid-cols-2 gap-2">
          {props.onImport && !isMobile && (
            <Button
              onClick={props.onImport}
              size="sm"
              variant="outline"
              disabled={isMobile}
            >
              <Upload className="w-4 h-4" />
              <span className="hidden md:inline!">Import</span>
            </Button>
          )}
          {props.onCopy && props.runnerType !== 'pacer' && (
            <Button
              onClick={props.onCopy}
              size="sm"
              variant="outline"
              title="Copy to other runner"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden md:inline!">Copy</span>
            </Button>
          )}
          {props.onSwap && props.runnerType !== 'pacer' && (
            <Button
              onClick={props.onSwap}
              size="sm"
              variant="outline"
              title="Swap runners"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span className="hidden md:inline!">Swap</span>
            </Button>
          )}
          <Button onClick={props.onReset} title="Reset runner" size="sm">
            <span className="hidden md:inline!">Reset</span>
            <TrashIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
