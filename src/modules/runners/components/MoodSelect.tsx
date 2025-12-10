import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { asMood, Mood } from '@/modules/simulation/lib/RaceParameters';

type MoodSelectProps = {
  value: Mood;
  onChange: (value: Mood) => void;
};

export function MoodSelect(props: MoodSelectProps) {
  const moodValues: { value: Mood; icon: string; label: string }[] = [
    { value: 2, icon: 'utx_ico_motivation_m_04', label: 'Great' },
    { value: 1, icon: 'utx_ico_motivation_m_03', label: 'Good' },
    { value: 0, icon: 'utx_ico_motivation_m_02', label: 'Normal' },
    { value: -1, icon: 'utx_ico_motivation_m_01', label: 'Bad' },
    { value: -2, icon: 'utx_ico_motivation_m_00', label: 'Awful' },
  ];

  const handleChange = (value: string) => {
    props.onChange(asMood(+value));
  };

  return (
    <Select value={props.value.toString()} onValueChange={handleChange}>
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
