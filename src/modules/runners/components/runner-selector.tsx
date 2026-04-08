import { useMemo, useRef, useState } from 'react';

import { getUmaImageUrl, useUmasForSearch } from '@/modules/runners/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  onReset?: () => void;
  onImport?: () => void;
  randomMobId?: number;
};

export const UmaSelector = (props: UmaSelectorProps) => {
  const { value, randomMobId, select } = props;
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const umasForSearch = useUmasForSearch();

  const imageUrl = useMemo(() => getUmaImageUrl(value, randomMobId), [value, randomMobId]);

  const selectedUma = useMemo(() => {
    const uma = umasForSearch.find((uma) => uma.id === value);

    if (!uma) return null;

    return {
      outfit: uma.outfit,
      name: uma.name,
    };
  }, [value, umasForSearch]);

  const handleSelectedItem = (outfitId: string) => {
    select(outfitId);
    setOpen(false);
  };

  // Reset scroll position when search value changes
  const handleSearchChange = () => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex flex-1 gap-2 cursor-pointer">
        <div className="w-18 h-18">
          <img src={imageUrl} alt={selectedUma?.name || 'Runner'} />
        </div>

        {selectedUma && (
          <div className="flex flex-col items-center justify-center">
            <div className="text-xs font-bold">{selectedUma.outfit}</div>
            <div className="text-sm">{selectedUma.name}</div>
          </div>
        )}
        {!selectedUma && (
          <div className="flex flex-col items-center justify-center">
            <div className="text-sm text-muted-foreground">Click me to select a runner</div>
          </div>
        )}
      </PopoverTrigger>

      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search" onValueChange={handleSearchChange} />
          <CommandList ref={listRef}>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {umasForSearch.map((uma) => (
                <CommandItem
                  key={uma.id}
                  value={`${uma.outfit} ${uma.name}`}
                  onSelect={() => handleSelectedItem(uma.id)}
                >
                  <img src={getUmaImageUrl(uma.id)} className="w-16 h-16" alt={uma.name} />
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
