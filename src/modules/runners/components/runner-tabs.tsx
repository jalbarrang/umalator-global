import { useSettingsStore } from '@/store/settings.store';
import { setCurrentIdx, useUIStore } from '@/store/ui.store';
import { Mode } from '@/utils/settings';
import { PosKeepMode } from '@simulation/lib/RaceSolver';

interface RunnerTabsProps {
  onToggleExpand: (e) => void;
}

export function RunnerTabs({ onToggleExpand }: RunnerTabsProps) {
  const { mode, currentIdx } = useUIStore();
  const { posKeepMode } = useSettingsStore();

  return (
    <>
      <div
        className={`umaTab ${currentIdx === 0 ? 'selected' : ''}`}
        onClick={() => setCurrentIdx(0)}
      >
        Umamusume 1
      </div>

      {mode === Mode.Compare && (
        <div
          className={`umaTab ${currentIdx === 1 ? 'selected' : ''}`}
          onClick={() => setCurrentIdx(1)}
        >
          Umamusume 2
          {posKeepMode !== PosKeepMode.Virtual && (
            <div id="expandBtn" title="Expand panel" onClick={onToggleExpand} />
          )}
        </div>
      )}

      {posKeepMode === PosKeepMode.Virtual && (
        <div
          className={`umaTab ${currentIdx === 2 ? 'selected' : ''}`}
          onClick={() => setCurrentIdx(2)}
        >
          Virtual Pacemaker
          <div id="expandBtn" title="Expand panel" onClick={onToggleExpand} />
        </div>
      )}
    </>
  );
}
