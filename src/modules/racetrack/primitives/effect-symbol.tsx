import { SkillType } from '@/lib/sunday-tools/skills/definitions';

export type EffectSymbolProps = {
  effectType: number;
  color: { fill: string; stroke: string };
  injected: boolean;
  size?: number;
};

export const EffectSymbol = (props: EffectSymbolProps) => {
  const { effectType, color, injected, size = 4 } = props;
  const strokeDasharray = injected ? '2,1' : undefined;

  if (effectType === SkillType.Recovery) {
    return (
      <polygon
        points={`0,-${size} ${size},0 0,${size} -${size},0`}
        fill={color.fill}
        stroke={color.stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth="1.2"
      />
    );
  }

  if (effectType === SkillType.Accel) {
    return (
      <polygon
        points={`0,-${size} ${size},${size} -${size},${size}`}
        fill={color.fill}
        stroke={color.stroke}
        strokeDasharray={strokeDasharray}
        strokeWidth="1.2"
      />
    );
  }

  if (effectType === SkillType.LaneMovementSpeed || effectType === SkillType.ChangeLane) {
    return (
      <>
        <rect
          x={-size}
          y={-size + 1}
          width={size * 2}
          height={(size - 1) * 2}
          fill={color.fill}
          stroke={color.stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth="1.1"
          rx="1"
          ry="1"
        />
        <line
          x1={-size + 1}
          y1={size - 1}
          x2={size - 1}
          y2={-size + 1}
          stroke={color.stroke}
          strokeWidth="1"
          strokeDasharray={strokeDasharray}
        />
      </>
    );
  }

  if (
    effectType === SkillType.TargetSpeed ||
    effectType === SkillType.CurrentSpeed ||
    effectType === SkillType.CurrentSpeedWithNaturalDeceleration
  ) {
    return (
      <>
        <polyline
          points={`${-size},-${size - 1} 0,0 ${-size},${size - 1}`}
          fill="none"
          stroke={color.stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={`0,-${size - 1} ${size},0 0,${size - 1}`}
          fill="none"
          stroke={color.stroke}
          strokeDasharray={strokeDasharray}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }

  return (
    <circle
      cx="0"
      cy="0"
      r={size - 1}
      fill={color.fill}
      stroke={color.stroke}
      strokeDasharray={strokeDasharray}
      strokeWidth="1.2"
    />
  );
};
