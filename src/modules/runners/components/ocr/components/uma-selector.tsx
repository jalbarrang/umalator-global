import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getIconById } from '@/modules/data/icons';
import { ExtractedUmaData } from '@/modules/runners/ocr/types';
import { useUmasForSearch } from '@/modules/runners/utils';
import { useUIStore } from '@/store/ui.store';
import { useState } from 'react';

interface OcrUmaSelectorProps {
  results: Partial<ExtractedUmaData> | null;
  isProcessing: boolean;
  onUpdateResults: (updates: Partial<ExtractedUmaData>) => void;
}

export function OcrUmaSelector(props: Readonly<OcrUmaSelectorProps>) {
  const { results, isProcessing, onUpdateResults } = props;
  const showUpcoming = useUIStore((state) => state.showUpcoming);
  const umasForSearch = useUmasForSearch(showUpcoming);
  const [umaSelectOpen, setUmaSelectOpen] = useState(false);

  const handleSelectUma = (outfitId: string) => {
    const uma = umasForSearch.find((entry) => entry.id === outfitId);
    if (!uma) {
      setUmaSelectOpen(false);
      return;
    }

    onUpdateResults({
      outfitId: uma.id,
      outfitName: uma.outfit,
      umaName: uma.name,
      umaConfidence: 1
    });

    setUmaSelectOpen(false);
  };

  const trigger = results?.outfitId ? (
    <button
      type="button"
      className="flex items-center gap-3 p-2 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors w-full text-left"
    >
      <img src={getIconById(results.outfitId)} alt={results.umaName} className="size-12 rounded" />
      <div>
        <p className="font-medium">{results.outfitName}</p>
        <p className="text-sm text-muted-foreground">{results.umaName}</p>
      </div>
    </button>
  ) : (
    <button
      type="button"
      className="p-2 border rounded-md text-muted-foreground text-sm cursor-pointer hover:bg-muted/50 transition-colors w-full text-left"
      disabled={isProcessing}
    >
      {isProcessing ? 'Detecting...' : 'Click to select uma'}
    </button>
  );

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Uma Detected</h4>
      <Popover open={umaSelectOpen} onOpenChange={setUmaSelectOpen}>
        <PopoverTrigger render={trigger} />
        <PopoverContent className="p-0 w-80">
          <Command>
            <CommandInput placeholder="Search uma..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {umasForSearch.map((uma) => (
                  <CommandItem
                    key={uma.id}
                    value={`${uma.outfit} ${uma.name}`}
                    onSelect={() => handleSelectUma(uma.id)}
                  >
                    <img
                      src={getIconById(uma.id)}
                      alt={uma.name}
                      className="size-10 rounded mr-2"
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
    </div>
  );
}
