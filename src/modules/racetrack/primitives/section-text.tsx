import i18n from '@/i18n';
import { useMemo } from 'react';

type SectionTextProps = {
  w: number;
  id: string;
  fields?: Record<string, string | number>;

  y?: number | string;
};

export const SectionText: React.FC<SectionTextProps> = (props) => {
  const { y = '50%', w, id, fields } = props;

  const translationKey = useMemo(
    () => (w < 10 ? `racetrack.short.${id}` : `racetrack.${id}`),
    [w, id],
  );

  return (
    <text
      className="sectionText text-[10px]!"
      x="50%"
      y={y}
      height="100%"
      width="100%"
      fill="rgb(121,64,22)"
    >
      {i18n.t(translationKey, fields)}
    </text>
  );
};
