import React, { useState, useCallback } from 'react';
import { isDeepStrictEqual } from 'node:util';
import { Box, Text, useInput } from 'ink';
import arrayToRotated from 'to-rotated';

/**
 * Props for custom indicator component.
 */
export type IndicatorProps = {
  isHighlighted?: boolean;
};

/**
 * Props for custom checkbox component.
 */
export type CheckBoxProps = {
  isSelected?: boolean;
};

/**
 * Props for custom item component.
 */
export type ItemProps = {
  isHighlighted?: boolean;
  label: string;
};

/**
 * Select item definition.
 */
export type ListedItem = {
  label: string;
  value: React.Key;
  key?: React.Key;
};

export type SelectedItem = {
  label?: string;
  value: React.Key;
  key?: React.Key;
};

/**
 * Default indicator component - shows cursor position.
 */
function Indicator({ isHighlighted }: IndicatorProps) {
  return (
    <Box marginRight={1}>
      <Text color={isHighlighted ? 'blue' : undefined}>
        {isHighlighted ? '❯' : ' '}
      </Text>
    </Box>
  );
}

/**
 * Default checkbox component - shows selection state.
 */
function CheckBox({ isSelected }: CheckBoxProps) {
  return (
    <Box marginRight={1}>
      <Text color={isSelected ? 'green' : undefined}>
        {isSelected ? '◉' : '◯'}
      </Text>
    </Box>
  );
}

/**
 * Default item component - renders the label.
 */
function Item({ isHighlighted, label }: ItemProps) {
  return <Text color={isHighlighted ? 'blue' : undefined}>{label}</Text>;
}

export type MultiSelectProps = {
  /**
   * Items to display in a list. Each item must be an object and have `label` and `value` props,
   * it may also optionally have a `key` prop.
   * If no `key` prop is provided, `value` will be used as the item key.
   */
  items?: ListedItem[];

  /**
   * Items set as selected (controlled mode).
   */
  selected?: SelectedItem[];

  /**
   * Items set as selected by default (uncontrolled mode).
   */
  defaultSelected?: SelectedItem[];

  /**
   * Listen to user's input. Useful in case there are multiple input components
   * at the same time and input must be "routed" to a specific component.
   */
  focus?: boolean;

  /**
   * Index of initially-highlighted item in `items` array.
   */
  initialIndex?: number;

  /**
   * Function to call when user selects an item.
   * Item object is passed to that function as an argument.
   */
  onSelect?: (item: ListedItem) => void;

  /**
   * Function to call when user unselects an item.
   * Item object is passed to that function as an argument.
   */
  onUnselect?: (item: ListedItem) => void;

  /**
   * Function to call when user highlights an item.
   * Item object is passed to that function as an argument.
   */
  onHighlight?: (item: ListedItem) => void;

  /**
   * Function to call when user submits selected items.
   * Selected Item list is passed to that function as an argument.
   */
  onSubmit?: (items: ListedItem[]) => void;

  /**
   * Custom component to override the default indicator component.
   */
  indicatorComponent?: React.ComponentType<IndicatorProps>;

  /**
   * Custom component to override the default checkbox component.
   */
  checkboxComponent?: React.ComponentType<CheckBoxProps>;

  /**
   * Custom component to override the default item component.
   */
  itemComponent?: React.ComponentType<ItemProps>;

  /**
   * Number of items to display.
   */
  limit?: number;
};

/**
 * Multi Select input component for Ink v6
 * A drop-in replacement for ink-multi-select that works with modern Ink.
 */
function MultiSelect({
  items = [],
  selected,
  defaultSelected = [],
  focus = true,
  initialIndex = 0,
  onSelect,
  onUnselect,
  onHighlight,
  onSubmit,
  indicatorComponent: IndicatorComponent = Indicator,
  checkboxComponent: CheckBoxComponent = CheckBox,
  itemComponent: ItemComponent = Item,
  limit: customLimit,
}: MultiSelectProps) {
  // Determine if we're in controlled mode
  const isControlled = selected !== undefined;

  // Internal selection state for uncontrolled mode
  const [internalSelected, setInternalSelected] =
    useState<SelectedItem[]>(defaultSelected);

  // Get the current selection based on mode
  const currentSelected = isControlled ? selected : internalSelected;

  // Calculate limit and scroll state
  const hasLimit =
    typeof customLimit === 'number' && items.length > customLimit;
  const limit = hasLimit ? Math.min(customLimit, items.length) : items.length;
  const lastIndex = limit - 1;

  // Track item values to detect changes and reset navigation
  const [prevItemValues, setPrevItemValues] = useState(() =>
    items.map((item) => item.value),
  );
  const currentItemValues = items.map((item) => item.value);
  const itemsChanged = !isDeepStrictEqual(prevItemValues, currentItemValues);

  // Navigation state - reset to 0 when items change
  const [rotateIndex, setRotateIndex] = useState(
    initialIndex > lastIndex ? lastIndex - initialIndex : 0,
  );
  const [highlightedIndex, setHighlightedIndex] = useState(
    initialIndex ? (initialIndex > lastIndex ? lastIndex : initialIndex) : 0,
  );

  // Update tracked values and reset navigation when items change
  if (itemsChanged) {
    setPrevItemValues(currentItemValues);
    if (rotateIndex !== 0) setRotateIndex(0);
    if (highlightedIndex !== 0) setHighlightedIndex(0);
  }

  // Helper to check if an item is selected
  const isItemSelected = useCallback(
    (item: ListedItem) => {
      const itemKey = item.key ?? item.value;
      return currentSelected.some((s) => (s.key ?? s.value) === itemKey);
    },
    [currentSelected],
  );

  // Helper to get selected items as ListedItems
  const getSelectedItems = useCallback(() => {
    return items.filter((item) => isItemSelected(item));
  }, [items, isItemSelected]);

  // Toggle selection of an item
  const toggleSelection = useCallback(
    (item: ListedItem) => {
      const wasSelected = isItemSelected(item);

      if (wasSelected) {
        // Unselect
        if (!isControlled) {
          setInternalSelected((prev) =>
            prev.filter((s) => (s.key ?? s.value) !== (item.key ?? item.value)),
          );
        }
        onUnselect?.(item);
      } else {
        // Select
        if (!isControlled) {
          setInternalSelected((prev) => [
            ...prev,
            { value: item.value, label: item.label, key: item.key },
          ]);
        }
        onSelect?.(item);
      }
    },
    [isControlled, isItemSelected, onSelect, onUnselect, setInternalSelected],
  );

  // Handle keyboard input
  useInput(
    useCallback(
      (input, key) => {
        // Navigate up
        if (input === 'k' || key.upArrow) {
          const atFirstIndex = highlightedIndex === 0;
          const nextIndex = hasLimit ? highlightedIndex : lastIndex;
          const nextRotateIndex = atFirstIndex ? rotateIndex + 1 : rotateIndex;
          const nextHighlightedIndex = atFirstIndex
            ? nextIndex
            : highlightedIndex - 1;

          setRotateIndex(nextRotateIndex);
          setHighlightedIndex(nextHighlightedIndex);

          const slicedItems = hasLimit
            ? arrayToRotated(items, nextRotateIndex).slice(0, limit)
            : items;

          if (onHighlight) {
            onHighlight(slicedItems[nextHighlightedIndex]!);
          }
        }

        // Navigate down
        if (input === 'j' || key.downArrow) {
          const atLastIndex =
            highlightedIndex === (hasLimit ? limit : items.length) - 1;
          const nextIndex = hasLimit ? highlightedIndex : 0;
          const nextRotateIndex = atLastIndex ? rotateIndex - 1 : rotateIndex;
          const nextHighlightedIndex = atLastIndex
            ? nextIndex
            : highlightedIndex + 1;

          setRotateIndex(nextRotateIndex);
          setHighlightedIndex(nextHighlightedIndex);

          const slicedItems = hasLimit
            ? arrayToRotated(items, nextRotateIndex).slice(0, limit)
            : items;

          if (onHighlight) {
            onHighlight(slicedItems[nextHighlightedIndex]!);
          }
        }

        // Toggle selection with space
        if (input === ' ') {
          const slicedItems = hasLimit
            ? arrayToRotated(items, rotateIndex).slice(0, limit)
            : items;
          const currentItem = slicedItems[highlightedIndex];
          if (currentItem) {
            toggleSelection(currentItem);
          }
        }

        // Submit with enter
        if (key.return) {
          if (onSubmit) {
            onSubmit(getSelectedItems());
          }
        }
      },
      [
        hasLimit,
        limit,
        rotateIndex,
        highlightedIndex,
        items,
        lastIndex,
        onHighlight,
        onSubmit,
        toggleSelection,
        getSelectedItems,
      ],
    ),
    { isActive: focus },
  );

  // Get visible items based on limit and rotation
  const slicedItems = hasLimit
    ? arrayToRotated(items, rotateIndex).slice(0, limit)
    : items;

  return (
    <Box flexDirection="column">
      {slicedItems.map((item, index) => {
        const isHighlighted = index === highlightedIndex;
        const isSelected = isItemSelected(item);

        return (
          <Box key={item.key ?? item.value}>
            <IndicatorComponent isHighlighted={isHighlighted} />
            <CheckBoxComponent isSelected={isSelected} />
            <ItemComponent isHighlighted={isHighlighted} label={item.label} />
          </Box>
        );
      })}
    </Box>
  );
}

export default MultiSelect;
