import { useId } from 'react';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { setShowUpcoming, useUIStore } from '@/store/ui.store';

type UpcomingToggleProps = {
  className?: string;
  labelClassName?: string;
};

export function UpcomingToggle(props: UpcomingToggleProps) {
  const { className, labelClassName } = props;
  const checkboxId = useId();
  const showUpcoming = useUIStore((state) => state.showUpcoming);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Checkbox
        id={checkboxId}
        checked={showUpcoming}
        onCheckedChange={(checked) => setShowUpcoming(checked === true)}
      />
      <Label htmlFor={checkboxId} className={cn('text-xs font-normal', labelClassName)}>
        Show upcoming
      </Label>
    </div>
  );
}
