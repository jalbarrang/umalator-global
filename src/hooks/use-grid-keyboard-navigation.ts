import { type KeyboardEventHandler, useCallback, useEffect, useRef, useState } from 'react';

type GridKeyboardNavigationOptions = {
  itemCount: number;
  columnCount: number;
  rowCount: number;
  scrollToRow: (rowIndex: number) => void;
  onSelectFocused: (index: number) => void;
  enableHorizontalNavigation?: boolean;
};

type GridKeyboardNavigationState = {
  focusedIndex: number;
  isBrowsing: boolean;
};

export function useGridKeyboardNavigation(options: GridKeyboardNavigationOptions) {
  const {
    itemCount,
    columnCount,
    rowCount,
    scrollToRow,
    onSelectFocused,
    enableHorizontalNavigation = true
  } = options;
  const [browseState, setBrowseState] = useState<GridKeyboardNavigationState>({
    focusedIndex: 0,
    isBrowsing: false
  });
  const previousItemCountRef = useRef(itemCount);

  if (previousItemCountRef.current !== itemCount) {
    previousItemCountRef.current = itemCount;

    if (browseState.focusedIndex !== 0 || browseState.isBrowsing) {
      setBrowseState({ focusedIndex: 0, isBrowsing: false });
    }
  }

  const { focusedIndex, isBrowsing } = browseState;

  useEffect(() => {
    if (focusedIndex <= itemCount - 1) {
      return;
    }

    setBrowseState((current) => ({
      ...current,
      focusedIndex: Math.max(0, itemCount - 1)
    }));
  }, [focusedIndex, itemCount]);

  const scrollFocusedIntoView = useCallback(
    (index: number) => {
      requestAnimationFrame(() => {
        scrollToRow(Math.floor(index / columnCount));
      });
    },
    [columnCount, scrollToRow]
  );

  const getLastIndexForRow = useCallback(
    (rowIndex: number) => {
      return Math.min(itemCount - 1, rowIndex * columnCount + columnCount - 1);
    },
    [columnCount, itemCount]
  );

  const moveFocusedHorizontally = useCallback(
    (delta: number) => {
      if (itemCount === 0) {
        return;
      }

      setBrowseState((current) => {
        const rowIndex = Math.floor(current.focusedIndex / columnCount);
        const rowStart = rowIndex * columnCount;
        const rowEnd = getLastIndexForRow(rowIndex);
        const next = Math.max(rowStart, Math.min(rowEnd, current.focusedIndex + delta));
        scrollFocusedIntoView(next);
        return { ...current, focusedIndex: next };
      });
    },
    [columnCount, getLastIndexForRow, itemCount, scrollFocusedIntoView]
  );

  const moveFocusedVertically = useCallback(
    (rowDelta: number) => {
      if (itemCount === 0) {
        return;
      }

      setBrowseState((current) => {
        const currentRowIndex = Math.floor(current.focusedIndex / columnCount);
        const currentColumnIndex = current.focusedIndex % columnCount;
        const nextRowIndex = Math.max(0, Math.min(rowCount - 1, currentRowIndex + rowDelta));
        const nextRowStart = nextRowIndex * columnCount;
        const nextRowEnd = getLastIndexForRow(nextRowIndex);
        const next = Math.min(nextRowEnd, nextRowStart + currentColumnIndex);
        scrollFocusedIntoView(next);
        return { ...current, focusedIndex: next };
      });
    },
    [columnCount, getLastIndexForRow, itemCount, rowCount, scrollFocusedIntoView]
  );

  const setFocusedIndex = useCallback((index: number) => {
    setBrowseState((current) => ({ ...current, focusedIndex: index }));
  }, []);

  const resetBrowsing = useCallback(() => {
    setBrowseState((current) => ({ ...current, isBrowsing: false }));
  }, []);

  const reset = useCallback((focusedIndexValue = 0) => {
    setBrowseState({ focusedIndex: focusedIndexValue, isBrowsing: false });
  }, []);

  const handleSearchKeyDown: KeyboardEventHandler<HTMLInputElement> = useCallback(
    (event) => {
      if (event.key === 'Escape' && isBrowsing) {
        event.preventDefault();
        event.stopPropagation();
        resetBrowsing();
        return;
      }

      if (itemCount === 0) {
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();

        if (!isBrowsing) {
          setBrowseState((current) => ({ ...current, isBrowsing: true }));
          scrollFocusedIntoView(focusedIndex);
          return;
        }

        moveFocusedVertically(event.key === 'ArrowUp' ? -1 : 1);
        return;
      }

      if (
        enableHorizontalNavigation &&
        isBrowsing &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        event.stopPropagation();
        moveFocusedHorizontally(event.key === 'ArrowLeft' ? -1 : 1);
        return;
      }

      if (event.key === 'Enter' && isBrowsing) {
        event.preventDefault();
        event.stopPropagation();
        onSelectFocused(focusedIndex);
        return;
      }

      if (
        isBrowsing &&
        (event.key === 'Backspace' ||
          event.key === 'Delete' ||
          event.key === 'Home' ||
          event.key === 'End' ||
          (!event.altKey && !event.ctrlKey && !event.metaKey && event.key.length === 1))
      ) {
        resetBrowsing();
      }
    },
    [
      enableHorizontalNavigation,
      focusedIndex,
      isBrowsing,
      itemCount,
      moveFocusedHorizontally,
      moveFocusedVertically,
      onSelectFocused,
      resetBrowsing,
      scrollFocusedIntoView
    ]
  );

  return {
    focusedIndex,
    isBrowsing,
    handleSearchKeyDown,
    reset,
    resetBrowsing,
    setFocusedIndex,
    scrollFocusedIntoView
  };
}
