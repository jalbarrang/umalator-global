import { IAptitudeFilters, IAptitudeSlotKey } from '../types';
import { AptitudeFilterRowSlot } from './filter-row-slot';

type AptitudeFilterRowProps = {
  label: string;
  slots: Array<{ key: IAptitudeSlotKey; name: string }>;
  filters: IAptitudeFilters;
  onChange: (key: IAptitudeSlotKey, value: number | null) => void;
};

export const AptitudeFilterRow = (props: Readonly<AptitudeFilterRowProps>) => {
  const { label, slots, filters, onChange } = props;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-[52px] text-muted-foreground">{label}:</span>

      <div className="grid grid-cols-2 gap-2">
        {slots.map((slot) => (
          <AptitudeFilterRowSlot key={slot.key} slot={slot} filters={filters} onChange={onChange} />
        ))}
      </div>
    </div>
  );
};
