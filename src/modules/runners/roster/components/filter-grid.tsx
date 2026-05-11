import { APTITUDE_ROWS } from '../constants';
import { IAptitudeFilters, IAptitudeSlotKey } from '../types';
import { AptitudeFilterRow } from './filter-row';

type IAptitudeFilterGridProps = {
  filters: IAptitudeFilters;
  onChange: (key: IAptitudeSlotKey, value: number | null) => void;
};

export function AptitudeFilterGrid(props: Readonly<IAptitudeFilterGridProps>) {
  const { filters, onChange } = props;

  return (
    <div className="flex flex-col gap-2">
      {APTITUDE_ROWS.map((row) => (
        <AptitudeFilterRow
          key={row.label}
          label={row.label}
          slots={row.slots}
          filters={filters}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
