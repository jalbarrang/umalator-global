import { useEffect } from 'react';
import { useStaminaCalculatorStore } from '../store/stamina-calculator.store';
import type { IGroundCondition } from '@/modules/simulation/lib/core/types';
import { GroundConditionName } from '@/modules/simulation/lib/core/types';
import { Label } from '@/components/ui/label';
import { TrackSelect } from '@/modules/racetrack/components/track-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSettingsStore } from '@/store/settings.store';

export function CoursePanel() {
  const { input, setInput } = useStaminaCalculatorStore();
  const { courseId } = useSettingsStore();

  // Sync course ID from global settings
  useEffect(() => {
    if (courseId !== input.courseId) {
      setInput({ courseId });
    }
  }, [courseId, input.courseId, setInput]);

  return (
    <>
      <div className="text-lg font-semibold">Race Course</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="course">Course</Label>
          <TrackSelect className="flex flex-col gap-2" />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="ground">Ground Condition</Label>
          <Select
            value={input.groundCondition.toString()}
            onValueChange={(value) => {
              if (value) {
                setInput({
                  groundCondition: parseInt(value) as IGroundCondition,
                });
              }
            }}
          >
            <SelectTrigger id="ground" className="w-full">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              {Object.entries(GroundConditionName).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );
}
