import { useStaminaCalculatorStore } from '../store/stamina-calculator.store';
import { StatInput } from '@/modules/runners/components/StatInput';

export const StatsPanel = () => {
  const { input, setInput } = useStaminaCalculatorStore();

  return (
    <>
      <div className="flex flex-col">
        <div className="grid grid-cols-5">
          <div className="flex items-center justify-center gap-2 bg-primary rounded-tl-sm">
            <img src="/icons/status_00.png" className="w-4 h-4" />
            <span className="text-white text-xs md:text-sm">Speed</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-primary">
            <img src="/icons/status_01.png" className="w-4 h-4" />
            <span className="text-white text-xs md:text-sm">Stamina</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-primary">
            <img src="/icons/status_02.png" className="w-4 h-4" />
            <span className="text-white text-xs md:text-sm">Power</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-primary">
            <img src="/icons/status_03.png" className="w-4 h-4" />
            <span className="text-white text-xs md:text-sm">Guts</span>
          </div>
          <div className="flex items-center justify-center gap-2 bg-primary rounded-tr-sm">
            <img src="/icons/status_04.png" className="w-4 h-4" />
            <span className="text-white text-xs md:text-sm">Wit</span>
          </div>
        </div>

        <div className="grid grid-cols-5">
          <StatInput
            value={input.speed}
            onChange={(value) => setInput({ speed: value })}
          />

          <StatInput
            value={input.stamina}
            onChange={(value) => setInput({ stamina: value })}
          />

          <StatInput
            value={input.power}
            onChange={(value) => setInput({ power: value })}
          />

          <StatInput
            value={input.guts}
            onChange={(value) => setInput({ guts: value })}
          />

          <StatInput
            value={input.wisdom}
            onChange={(value) => setInput({ wisdom: value })}
          />
        </div>
      </div>
    </>
  );
};
