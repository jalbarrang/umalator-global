import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

type MoodSelectProps = {
  value: number;
  onChange: (value: number) => void;
};

export function MoodSelect(props: MoodSelectProps) {
  const moodValues = [
    { value: 2, icon: 'utx_ico_motivation_m_04', label: 'Great' },
    { value: 1, icon: 'utx_ico_motivation_m_03', label: 'Good' },
    { value: 0, icon: 'utx_ico_motivation_m_02', label: 'Normal' },
    { value: -1, icon: 'utx_ico_motivation_m_01', label: 'Bad' },
    { value: -2, icon: 'utx_ico_motivation_m_00', label: 'Awful' },
  ];

  return (
    <Select
      value={props.value.toString()}
      onValueChange={(value) => props.onChange(parseInt(value))}
    >
      <SelectTrigger className="border-none rounded-none shadow-none">
        <img
          src={`/icons/global/${
            moodValues.find((m) => m.value === props.value)?.icon
          }.png`}
          className="w-13 h-5"
        />
      </SelectTrigger>
      <SelectContent>
        {moodValues.map((mood) => (
          <SelectItem key={mood.value} value={mood.value.toString()}>
            <img src={`/icons/global/${mood.icon}.png`} className="w-13 h-5" />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
