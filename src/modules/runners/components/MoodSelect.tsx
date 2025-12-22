import type { IMood } from '@/modules/simulation/lib/core/types';
import { Mood } from '@/modules/simulation/lib/core/types';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type MoodSelectProps = {
  value: IMood;
  onChange: (value: IMood) => void;
  className?: string;
};

export function MoodSelect(props: MoodSelectProps) {
  const { className = '' } = props;

  const moodValues: Array<{ value: IMood; icon: string; label: string }> = [
    { value: Mood.Great, icon: 'utx_ico_motivation_m_04', label: 'Great' },
    { value: Mood.Good, icon: 'utx_ico_motivation_m_03', label: 'Good' },
    { value: Mood.Normal, icon: 'utx_ico_motivation_m_02', label: 'Normal' },
    { value: Mood.Bad, icon: 'utx_ico_motivation_m_01', label: 'Bad' },
    { value: Mood.Awful, icon: 'utx_ico_motivation_m_00', label: 'Awful' },
  ];

  const handleChange = (value: string | null) => {
    if (!value) {
      return;
    }

    props.onChange(+value as IMood);
  };

  return (
    <Select value={props.value.toString()} onValueChange={handleChange}>
      <SelectTrigger className={cn('border-none rounded-none shadow-none', className)}>
        <img
          src={`/icons/global/${moodValues.find((m) => m.value === props.value)?.icon}.png`}
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
