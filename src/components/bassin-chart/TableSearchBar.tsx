import { ChevronDown, ChevronUp, SearchIcon, XIcon } from 'lucide-react';
import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type TableSearchBarProps = {
  isOpen: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
  currentMatchIndex: number;
  totalMatches: number;
  hasMatches: boolean;
  searchInputRef: RefObject<HTMLInputElement | null>;
};

export function TableSearchBar({
  isOpen,
  searchQuery,
  onSearchChange,
  onClose,
  onNext,
  onPrevious,
  currentMatchIndex,
  totalMatches,
  hasMatches,
  searchInputRef,
}: TableSearchBarProps) {
  if (!isOpen) return null;

  return (
    <div className="flex items-center gap-2 p-2 border-b bg-muted/30">
      <div className="flex items-center gap-2 flex-1">
        <SearchIcon className="w-4 h-4 text-muted-foreground" />
        <Input
          ref={searchInputRef}
          type="text"
          placeholder="Search skills... (Ctrl+F)"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 text-sm flex-1 max-w-md"
        />
        {searchQuery && (
          <div
            className={cn(
              'text-xs px-2 py-1 rounded',
              hasMatches ? 'text-muted-foreground' : 'text-destructive',
            )}
          >
            {hasMatches ? `${currentMatchIndex + 1} / ${totalMatches}` : 'No matches'}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onPrevious}
          disabled={!hasMatches}
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onNext}
          disabled={!hasMatches}
          title="Next match (Enter)"
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Close (Escape)">
          <XIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
