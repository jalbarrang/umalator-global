import * as React from 'react';

import { cn } from '@/lib/utils';

function Panel({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel"
      className={cn('flex flex-col h-full', className)}
      {...props}
    />
  );
}

function PanelHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel-header"
      className={cn('px-4 py-3 border-b', className)}
      {...props}
    />
  );
}

function PanelTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel-title"
      className={cn('text-sm font-medium', className)}
      {...props}
    />
  );
}

function PanelDescription({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel-description"
      className={cn('text-muted-foreground text-sm', className)}
      {...props}
    />
  );
}

function PanelContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel-content"
      className={cn('flex-1 min-h-0 overflow-y-auto px-4 py-3', className)}
      {...props}
    />
  );
}

function PanelFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="panel-footer"
      className={cn('px-4 py-3 border-t', className)}
      {...props}
    />
  );
}

export {
  Panel,
  PanelHeader,
  PanelFooter,
  PanelTitle,
  PanelDescription,
  PanelContent,
};
