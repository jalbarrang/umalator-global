'use client';

import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import {
  Combobox,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxClear,
  ComboboxContent,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxItemIndicator,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipRemove,
} from '@/components/ui/combobox';

// Re-export with MultiSelect naming for backward compatibility
function MultiSelect<Value, Multiple extends boolean = true>({
  multiple = true as Multiple,
  ...props
}: ComboboxPrimitive.Root.Props<Value, Multiple>) {
  return <Combobox multiple={multiple} {...props} />;
}

function MultiSelectInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return <ComboboxInput className={className} {...props} />;
}

function MultiSelectTrigger({
  className,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return <ComboboxTrigger className={className} {...props} />;
}

function MultiSelectClear({
  className,
  ...props
}: ComboboxPrimitive.Clear.Props) {
  return <ComboboxClear className={className} {...props} />;
}

function MultiSelectValue({
  placeholder,
  className,
  ...props
}: ComboboxPrimitive.Chips.Props & {
  placeholder?: string;
}) {
  return (
    <ComboboxChips
      className={cn('flex flex-wrap gap-1.5', className)}
      {...props}
    />
  );
}

function MultiSelectChip({
  className,
  ...props
}: ComboboxPrimitive.Chip.Props) {
  return (
    <ComboboxChip
      className={cn(
        'group inline-flex items-center gap-1 rounded-md border border-input bg-background px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
        className,
      )}
      {...props}
    />
  );
}

function MultiSelectChipRemove({
  className,
  ...props
}: ComboboxPrimitive.ChipRemove.Props) {
  return (
    <ComboboxChipRemove
      className={cn(
        'ml-1 rounded-sm text-muted-foreground opacity-70 hover:text-destructive hover:opacity-100 focus:opacity-100 focus:outline-none',
        className,
      )}
      {...props}
    >
      <XIcon className="size-3" />
    </ComboboxChipRemove>
  );
}

function MultiSelectContent({
  className,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    'align' | 'alignOffset' | 'side' | 'sideOffset'
  >) {
  return <ComboboxContent className={className} {...props} />;
}

function MultiSelectList({
  className,
  ...props
}: ComboboxPrimitive.List.Props) {
  return <ComboboxList className={className} {...props} />;
}

function MultiSelectEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props) {
  return <ComboboxEmpty className={className} {...props} />;
}

function MultiSelectItem({
  className,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxItem className={className} {...props}>
      <ComboboxItemIndicator />
      {props.children}
    </ComboboxItem>
  );
}

function MultiSelectGroup({
  className,
  ...props
}: ComboboxPrimitive.Group.Props) {
  return <ComboboxGroup className={className} {...props} />;
}

function MultiSelectGroupLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return <ComboboxGroupLabel className={className} {...props} />;
}

function MultiSelectSeparator({
  className,
  ...props
}: ComboboxPrimitive.Separator.Props) {
  return <ComboboxSeparator className={className} {...props} />;
}

export {
  MultiSelect,
  MultiSelectInput,
  MultiSelectTrigger,
  MultiSelectClear,
  MultiSelectValue,
  MultiSelectChip,
  MultiSelectChipRemove,
  MultiSelectContent,
  MultiSelectList,
  MultiSelectEmpty,
  MultiSelectItem,
  MultiSelectGroup,
  MultiSelectGroupLabel,
  MultiSelectSeparator,
};
