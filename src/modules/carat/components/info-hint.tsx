import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger
} from '@/components/ui/popover';

export type InfoHintProps = {
  label: string;
  title: string;
  children: React.ReactNode;
};

export function InfoHint(props: InfoHintProps) {
  const { label, title, children } = props;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            aria-label={label}
          />
        }
      >
        <HelpCircle className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-80 gap-2 p-3">
        <PopoverTitle>{title}</PopoverTitle>
        <PopoverDescription>
          <span className="block text-sm leading-6 text-muted-foreground">{children}</span>
        </PopoverDescription>
      </PopoverContent>
    </Popover>
  );
}
