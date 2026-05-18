import { useMemo, useRef, useState } from 'react';

import { UpcomingToggle } from '@/components/upcoming-toggle';
import { getUmaDisplayInfo, getUmaImageUrl, useUmasForSearch } from '@/modules/runners/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { useUIStore } from '@/store/ui.store';

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
  const showUpcoming = useUIStore((state) => state.showUpcoming);
  const umasForSearch = useUmasForSearch(showUpcoming);

  const imageUrl = useMemo(() => getUmaImageUrl(value, randomMobId), [value, randomMobId]);

  const selectedUma = useMemo(() => {
    if (!value) {
      return null;
    }

    return getUmaDisplayInfo(value);
  }, [value]);

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
        <div className="size-18">
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
          <div className="border-b px-3 py-2">
            <UpcomingToggle />
          </div>
          <CommandList ref={listRef}>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {umasForSearch.map((uma) => (
                <CommandItem
                  key={uma.id}
                  value={`${uma.outfit} ${uma.name}`}
                  onSelect={() => handleSelectedItem(uma.id)}
                >
                  <img src={getUmaImageUrl(uma.id)} className="size-16" alt={uma.name} />
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
