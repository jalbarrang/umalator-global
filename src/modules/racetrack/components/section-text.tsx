import i18n from '@/i18n';

type SectionTextProps = {
  w: number;
  id: string;
  fields?: Record<string, string | number>;
};

export const SectionText: React.FC<SectionTextProps> = (props) => {
  const { w, id, fields } = props;

  const translationKey = `racetrack${w < 0.085 ? '.short' : ''}.${id}`;

  return (
    <text
      className="sectionText"
      x="50%"
      y="50%"
      height="40%"
      width="100%"
      fill="rgb(121,64,22)"
    >
      {i18n.t(translationKey, fields) as string}
    </text>
  );
};
