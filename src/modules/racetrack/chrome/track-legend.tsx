import { debuffColors, recoveryColors } from '@/utils/colors';
import { SkillType } from '@/lib/sunday-tools/skills/definitions';
import { EffectSymbol } from '../primitives/effect-symbol';

export const TrackLegend = () => {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground bg-card px-4 py-2 rounded-md">
      <span className="font-semibold tracking-wide">Legend</span>
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <g transform="translate(8 8)">
            <EffectSymbol
              effectType={SkillType.TargetSpeed}
              color={recoveryColors[0]}
              injected={false}
            />
          </g>
        </svg>
        <span>Speed</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <g transform="translate(8 8)">
            <EffectSymbol
              effectType={SkillType.Accel}
              color={recoveryColors[0]}
              injected={false}
            />
          </g>
        </svg>
        <span>Accel</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <g transform="translate(8 8)">
            <EffectSymbol
              effectType={SkillType.Recovery}
              color={recoveryColors[0]}
              injected={false}
            />
          </g>
        </svg>
        <span>Recovery / drain</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <g transform="translate(8 8)">
            <EffectSymbol
              effectType={SkillType.LaneMovementSpeed}
              color={recoveryColors[0]}
              injected={false}
            />
          </g>
        </svg>
        <span>Lane</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true">
          <rect
            x="1"
            y="5"
            width="16"
            height="6"
            fill={recoveryColors[0].fill}
            stroke={recoveryColors[0].stroke}
            strokeWidth="1"
            rx="1"
            ry="1"
          />
        </svg>
        <span>Self clip</span>
      </div>
      <div className="flex items-center gap-2">
        <svg width="18" height="16" viewBox="0 0 18 16" aria-hidden="true">
          <rect
            x="1"
            y="5"
            width="16"
            height="6"
            fill={debuffColors[0].fill}
            stroke={debuffColors[0].stroke}
            strokeDasharray="2,2"
            strokeWidth="1"
            rx="1"
            ry="1"
            opacity="0.75"
          />
        </svg>
        <span>Injected clip</span>
      </div>
    </div>
  );
};
