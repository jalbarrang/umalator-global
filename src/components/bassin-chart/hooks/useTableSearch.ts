import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import type { Row } from '@tanstack/react-table';

type UseTableSearchOptions<T> = {
  rows: Array<Row<T>>;
  getSearchableText: (row: Row<T>) => string;
  onScrollToRow: (index: number) => void;
};

export function useTableSearch<T>({
  rows,
  getSearchableText,
  onScrollToRow,
}: UseTableSearchOptions<T>) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Find matching rows
  const matchingIndices = useCallback(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase();
    const matches: Array<number> = [];

    rows.forEach((row, index) => {
      const searchText = getSearchableText(row).toLowerCase();
      if (searchText.includes(query)) {
        matches.push(index);
      }
    });

    return matches;
  }, [rows, searchQuery, getSearchableText]);

  const matches = matchingIndices();
  const hasMatches = matches.length > 0;

  // Navigate to next match
  const goToNextMatch = useCallback(() => {
    if (matches.length === 0) return;

    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    onScrollToRow(matches[nextIndex]);
  }, [matches, currentMatchIndex, onScrollToRow]);

  // Navigate to previous match
  const goToPreviousMatch = useCallback(() => {
    if (matches.length === 0) return;

    const prevIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    onScrollToRow(matches[prevIndex]);
  }, [matches, currentMatchIndex, onScrollToRow]);

  // Reset match index when search query changes
  useEffect(() => {
    setCurrentMatchIndex(0);
    if (matches.length > 0) {
      onScrollToRow(matches[0]);
    }
  }, [searchQuery, matches.length]); // Intentionally not including onScrollToRow to avoid loop

  // Handle Ctrl+F (or Cmd+F on Mac)
  useHotkeys(
    'mod+f',
    (event) => {
      event.preventDefault();
      setIsSearchOpen(true);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 0);
    },
    { enableOnFormTags: true },
  );

  // Handle Escape to close search
  useHotkeys(
    'escape',
    () => {
      if (isSearchOpen) {
        setIsSearchOpen(false);
        setSearchQuery('');
        setCurrentMatchIndex(0);
      }
    },
    { enableOnFormTags: true, enabled: isSearchOpen },
  );

  // Handle Enter for next match
  useHotkeys(
    'enter',
    (event) => {
      event.preventDefault();
      goToNextMatch();
    },
    { enableOnFormTags: true, enabled: isSearchOpen && hasMatches },
  );

  // Handle Shift+Enter for previous match
  useHotkeys(
    'shift+enter',
    (event) => {
      event.preventDefault();
      goToPreviousMatch();
    },
    { enableOnFormTags: true, enabled: isSearchOpen && hasMatches },
  );

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
    setCurrentMatchIndex(0);
  }, []);

  return {
    isSearchOpen,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    matches,
    currentMatchIndex,
    hasMatches,
    goToNextMatch,
    goToPreviousMatch,
    closeSearch,
  };
}
