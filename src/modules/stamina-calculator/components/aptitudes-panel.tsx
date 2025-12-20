import { Label } from '@/components/ui/label';
import { AptitudeSelect } from '@/modules/runners/components/AptitudeSelect';
import { MoodSelect } from '@/modules/runners/components/MoodSelect';
import { StrategySelect } from '@/modules/runners/components/StrategySelect';
import { useStaminaCalculatorStore } from '@/modules/stamina-calculator/store/stamina-calculator.store';

export function AptitudesPanel() {
  const { input, setInput } = useStaminaCalculatorStore();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2" htmlFor="strategy">
            Running Style
          </Label>

          <StrategySelect
            value={input.strategy}
            onChange={(value) => setInput({ strategy: value ?? undefined })}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2" htmlFor="distance-apt">
            Distance Aptitude
          </Label>
          <AptitudeSelect
            value={input.distanceAptitude}
            onChange={(value) => setInput({ distanceAptitude: value })}
          />
        </div>

        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2" htmlFor="surface-apt">
            Surface Aptitude
          </Label>
          <AptitudeSelect
            value={input.surfaceAptitude}
            onChange={(value) => setInput({ surfaceAptitude: value })}
          />
        </div>

        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2" htmlFor="strategy-apt">
            Style Aptitude
          </Label>
          <AptitudeSelect
            value={input.strategyAptitude}
            onChange={(value) => setInput({ strategyAptitude: value })}
          />
        </div>

        <div className="flex items-center gap-2 justify-between border rounded-xl">
          <Label className="pl-2" htmlFor="mood">
            Mood
          </Label>
          <MoodSelect
            value={input.mood}
            onChange={(value) => setInput({ mood: value })}
          />
        </div>
      </div>
    </>
  );
}
